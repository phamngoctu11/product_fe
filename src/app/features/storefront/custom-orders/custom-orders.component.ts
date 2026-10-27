import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { CustomRequestDTO } from '../../../model/custom-request.model';
import { Order, OrderListDTO } from '../../../model/order.model';
import { CustomRequestService } from '../../../service/custom-request.service';
import { OrderService } from '../../../service/order.service';
import { ToastService } from '../../../service/toast.service';
import { OrderCollaborationComponent } from '../../shared/order-collaboration/order-collaboration.component';
import { OrderStatusBadgeComponent } from '../../shared/ui/order-status-badge/order-status-badge.component';
import { ViewStateComponent } from '../../shared/ui/view-state/view-state.component';

@Component({
  selector: 'app-custom-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    OrderCollaborationComponent,
    OrderStatusBadgeComponent,
    ViewStateComponent,
  ],
  templateUrl: './custom-orders.component.html',
  styleUrl: './custom-orders.component.css',
})
export class CustomOrdersComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly customRequestService = inject(CustomRequestService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  customOrders: OrderListDTO[] = [];
  selectedOrder: Order | null = null;
  selectedOrderId: number | null = null;

  isLoadingList = false;
  isLoadingDetail = false;
  statusFilter = 'DISCUSSING';

  ngOnInit(): void {
    this.loadOrders();
    this.route.queryParams.subscribe((params) => {
      const orderId = Number(params['orderId']);
      if (Number.isInteger(orderId) && orderId > 0) {
        this.selectOrderById(orderId);
      }
    });
  }

  loadOrders(): void {
    this.isLoadingList = true;
    forkJoin({
      myOrders: this.orderService.getMyOrders(0, 100).pipe(catchError(() => of({ content: [] as OrderListDTO[] }))),
      customReqs: this.customRequestService.list(undefined, 0, 100).pipe(catchError(() => of({ content: [] as CustomRequestDTO[] }))),
    }).subscribe({
      next: ({ myOrders, customReqs }) => {
        const allOrders = (myOrders && myOrders.content) || [];
        const reqs = (customReqs && customReqs.content) || [];
        const customLinkedOrderIds = new Set(
          reqs
            .map((r) => r.linkedOrderId)
            .filter((id): id is number => typeof id === 'number' && id > 0)
        );

        // Identify custom orders:
        // 1. Linked to a CustomRequest
        // 2. Explicit orderType === 'CUSTOM'
        // 3. Status is DISCUSSING or WAITING_STAFF_CONFIRMATION (these states exist in custom negotiation flow)
        // 4. Currently selected order ID matches
        this.customOrders = allOrders.filter((o) => {
          const type = (o.orderType || '').toUpperCase();
          const status = (o.status || '').toUpperCase();
          return (
            type === 'CUSTOM' ||
            customLinkedOrderIds.has(o.id) ||
            status === 'DISCUSSING' ||
            status === 'WAITING_STAFF_CONFIRMATION' ||
            (this.selectedOrderId != null && o.id === this.selectedOrderId)
          );
        });

        // Ensure orderType is tagged as CUSTOM on these items
        this.customOrders.forEach((o) => {
          o.orderType = 'CUSTOM';
        });

        // If a specific order was selected via query param or previous selection
        if (this.selectedOrderId) {
          const exists = this.customOrders.some((o) => o.id === this.selectedOrderId);
          if (!exists && this.selectedOrder) {
            this.customOrders.unshift({
              id: this.selectedOrder.id,
              customerName: this.selectedOrder.customerName || this.selectedOrder.recipientName || 'Khách hàng',
              finalPrice: this.selectedOrder.finalPrice ?? 0,
              status: this.selectedOrder.status,
              startOrderTime: this.selectedOrder.startOrderTime,
              paymentMethod: this.selectedOrder.paymentMethod || '',
              staffName: this.selectedOrder.staffName,
              orderType: 'CUSTOM',
            });
          }
        }

        this.isLoadingList = false;

        // Auto-select first order if none selected or currently selected is not in list
        if (this.customOrders.length > 0 && !this.selectedOrderId) {
          const first = this.filteredOrders[0];
          if (first) this.selectOrder(first);
        }
      },
      error: (err) => {
        this.isLoadingList = false;
        this.toast.fromError(err, 'Không thể tải danh sách đơn đặt riêng.');
      },
    });
  }

  get filteredOrders(): OrderListDTO[] {
    return this.customOrders.filter((o) => (o.status || '').toUpperCase() === this.statusFilter);
  }

  selectOrder(order: OrderListDTO): void {
    if (this.selectedOrderId === order.id && this.selectedOrder) {
      return;
    }
    this.selectOrderById(order.id);
  }

  selectOrderById(orderId: number): void {
    this.selectedOrderId = orderId;
    this.isLoadingDetail = true;
    this.orderService.getById(orderId).subscribe({
      next: (detail) => {
        this.selectedOrder = detail;
        this.isLoadingDetail = false;
        if (!this.customOrders.some((order) => order.id === detail.id && (order.status || '').toUpperCase() === this.statusFilter)) {
          this.statusFilter = (detail.status || 'DISCUSSING').toUpperCase();
        }
        const exists = this.customOrders.some((o) => o.id === detail.id);
        if (!exists) {
          this.customOrders.unshift({
            id: detail.id,
            customerName: detail.customerName || detail.recipientName || 'Khách hàng',
            finalPrice: detail.finalPrice ?? 0,
            status: detail.status,
            startOrderTime: detail.startOrderTime,
            paymentMethod: detail.paymentMethod || '',
            staffName: detail.staffName,
            orderType: detail.orderType || 'CUSTOM',
          });
        }
      },
      error: (err) => {
        this.isLoadingDetail = false;
        this.toast.fromError(err, 'Không thể tải chi tiết đơn hàng.');
      },
    });
  }

  onOrderUpdated(): void {
    if (this.selectedOrderId) {
      this.orderService.getById(this.selectedOrderId).subscribe({
        next: (detail) => {
          this.selectedOrder = detail;
          this.loadOrders();
        },
        error: () => this.loadOrders(),
      });
    } else {
      this.loadOrders();
    }
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      DISCUSSING: 'Đang trao đổi',
      WAITING_STAFF_CONFIRMATION: 'Chờ NV xác nhận',
      ORDER_ACCEPTED: 'Đã chốt thỏa thuận',
      ORDER_CREATING: 'Đang sản xuất',
      READY_TO_SHIP: 'Sẵn sàng giao',
      SHIPPING: 'Đang giao hàng',
      DELIVERED: 'Đã giao hàng',
      CANCELLED: 'Đã hủy',
    };
    return map[status?.toUpperCase()] || status;
  }
}

