import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Order, OrderListDTO } from '../../../model/order.model';
import { OrderService } from '../../../service/order.service';
import { ToastService } from '../../../service/toast.service';
import { OrderCollaborationComponent } from '../../shared/order-collaboration/order-collaboration.component';
import { OrderStatusBadgeComponent } from '../../shared/ui/order-status-badge/order-status-badge.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { ViewStateComponent } from '../../shared/ui/view-state/view-state.component';

@Component({
  selector: 'app-staff-custom-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PageHeaderComponent,
    OrderCollaborationComponent,
    OrderStatusBadgeComponent,
    ViewStateComponent,
  ],
  templateUrl: './staff-custom-orders.component.html',
  styleUrl: './staff-custom-orders.component.css',
})
export class StaffCustomOrdersComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  customOrders: OrderListDTO[] = [];
  selectedOrder: Order | null = null;
  selectedOrderId: number | null = null;

  isLoadingList = false;
  isLoadingDetail = false;
  statusFilter = 'ALL';

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
    this.orderService.getMyStaffOrders(0, 100).subscribe({
      next: (res) => {
        const orders = res.content || [];
        this.customOrders = orders.filter((o) => {
          const type = (o.orderType || '').toUpperCase();
          const status = (o.status || '').toUpperCase();
          return (
            type === 'CUSTOM' ||
            status === 'DISCUSSING' ||
            status === 'WAITING_STAFF_CONFIRMATION' ||
            status === 'ORDER_ACCEPTED' ||
            (this.selectedOrderId != null && o.id === this.selectedOrderId)
          );
        });

        if (this.customOrders.length === 0 && orders.length > 0) {
          this.customOrders = [...orders];
        }

        this.customOrders.forEach((o) => {
          if (!o.orderType) o.orderType = 'CUSTOM';
        });

        this.isLoadingList = false;

        if (this.customOrders.length > 0 && !this.selectedOrderId) {
          const first = this.filteredOrders[0] || this.customOrders[0];
          this.selectOrder(first);
        }
      },
      error: (err) => {
        this.isLoadingList = false;
        this.toast.fromError(err, 'Không thể tải danh sách đơn trao đổi.');
      },
    });
  }

  get filteredOrders(): OrderListDTO[] {
    if (this.statusFilter === 'ALL') {
      return this.customOrders;
    }
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
        this.toast.fromError(err, 'Không thể tải chi tiết phòng trao đổi đơn #' + orderId);
      },
    });
  }

  onOrderUpdated(): void {
    if (this.selectedOrderId) {
      this.orderService.getById(this.selectedOrderId).subscribe({
        next: (detail) => {
          this.selectedOrder = detail;
          const idx = this.customOrders.findIndex((o) => o.id === detail.id);
          if (idx >= 0) {
            this.customOrders[idx] = {
              ...this.customOrders[idx],
              status: detail.status,
              finalPrice: detail.finalPrice ?? 0,
            };
          }
        },
      });
    }
    this.loadOrders();
  }
}

