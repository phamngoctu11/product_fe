import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActionDialogService } from '../../../service/action-dialog.service';
import { ToastService } from '../../../service/toast.service';
import { FormsModule } from '@angular/forms';
import { Order, OrderAssignmentQueueItem, OrderItem, OrderListDTO } from '../../../model/order.model';
import { getApiErrorMessage } from '../../../model/api-response.model';
import { OrderService } from '../../../service/order.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  AppPaginationComponent,
  OrderItemsTableComponent,
  OrderStatusBadgeComponent,
  OrderSummaryCardComponent,
  PageHeaderComponent,
  ViewStateComponent,
} from '../../shared/ui';
import { OrderCollaborationComponent } from '../../shared/order-collaboration/order-collaboration.component';
import { StaffProductionCheckpointComponent } from '../../shared/production-checkpoint/staff-production-checkpoint.component';
import { ChangeRequestPanelComponent } from '../../shared/change-request/change-request-panel.component';

@Component({
  selector: 'app-staff-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    AppPaginationComponent,
    OrderItemsTableComponent,
    PageHeaderComponent,
    OrderSummaryCardComponent,
    OrderStatusBadgeComponent,
    ViewStateComponent,
    OrderCollaborationComponent,
    StaffProductionCheckpointComponent,
    ChangeRequestPanelComponent,
  ],
  templateUrl: './staff-orders.component.html',
  styleUrl: './staff-orders.component.css',
})
export class StaffOrdersComponent implements OnInit {
  private readonly actionDialog = inject(ActionDialogService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  claimableOrders: OrderAssignmentQueueItem[] = [];
  myOrders: OrderListDTO[] = [];
  activeTab: 'pending' | 'mine' = 'pending';

  isLoading = false;
  pendingPage = 0;
  minePage = 0;
  pageSize = 20;
  pendingTotalPages = 0;
  mineTotalPages = 0;
  pendingTotalElements = 0;
  mineTotalElements = 0;
  pageSizeOptions = [10, 20, 50, 100];

  selectedOrder: Order | null = null;
  detailLoading = false;

  isStartingProduction = false;
  showStartProductionModal = false;
  lateStartReason = '';
  startProductionKey: string | null = null;

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.loadData();
    this.route.queryParams.subscribe((params) => {
      const orderId = Number(params['orderId']);
      if (Number.isInteger(orderId) && orderId > 0) {
        this.activeTab = 'mine';
        this.openOrderDetailById(orderId);
      }
    });
  }

  loadData(): void {
    this.isLoading = true;
    this.pendingPage = 0;
    this.minePage = 0;
    this.orderService.getClaimableOrders(this.pendingPage, this.pageSize).subscribe({
      next: (page) => {
        this.claimableOrders = page.content || [];
        this.pendingPage = page.number || 0;
        this.pageSize = page.size || this.pageSize;
        this.pendingTotalPages = page.totalPages || 0;
        this.pendingTotalElements = page.totalElements || 0;
        this.loadMyOrders();
      },
      error: (err) => {
        this.toast.notify('Không thể tải hàng đợi đơn có thể nhận: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.isLoading = false;
      },
    });
  }

  loadMyOrders(): void {
    this.orderService.getMyStaffOrders(this.minePage, this.pageSize).subscribe({
      next: (page) => {
        this.myOrders = page.content || [];
        this.minePage = page.number || 0;
        this.pageSize = page.size || this.pageSize;
        this.mineTotalPages = page.totalPages || 0;
        this.mineTotalElements = page.totalElements || 0;
        this.isLoading = false;
      },
      error: (err) => {
        this.toast.notify('Không thể tải đơn phụ trách: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.isLoading = false;
      },
    });
  }

  changePendingPage(page: number): void {
    if (page < 0 || page >= this.pendingTotalPages) return;

    this.isLoading = true;
    this.pendingPage = page;
    this.orderService.getClaimableOrders(this.pendingPage, this.pageSize).subscribe({
      next: (res) => {
        this.claimableOrders = res.content || [];
        this.pendingPage = res.number ?? page;
        this.pendingTotalPages = res.totalPages || 0;
        this.pendingTotalElements = res.totalElements || 0;
        this.isLoading = false;
      },
      error: (err) => {
        this.toast.notify('Không thể tải trang đơn chờ nhận: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.isLoading = false;
      },
    });
  }

  changeMyOrdersPage(page: number): void {
    if (page < 0 || page >= this.mineTotalPages) return;

    this.isLoading = true;
    this.minePage = page;
    this.orderService.getMyStaffOrders(this.minePage, this.pageSize).subscribe({
      next: (res) => {
        this.myOrders = res.content || [];
        this.minePage = res.number ?? page;
        this.mineTotalPages = res.totalPages || 0;
        this.mineTotalElements = res.totalElements || 0;
        this.isLoading = false;
      },
      error: (err) => {
        this.toast.notify('Không thể tải trang đơn phụ trách: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.isLoading = false;
      },
    });
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.loadData();
  }

  claimOrder(order: OrderAssignmentQueueItem): void {
    this.actionDialog.confirm({
      title: 'Nhận xử lý đơn hàng',
      message: `Bạn muốn nhận phụ trách đơn hàng #${order.orderId}?`,
      confirmText: 'Nhận đơn',
      icon: 'bi-box-arrow-in-down',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.isLoading = true;
      this.orderService.claimOrder(order.orderId, order.orderVersion).subscribe({
        next: (result) => {
          this.toast.notify(`Đã nhận đơn #${order.orderId} – trạng thái ${result.orderStatus}.`);
          this.activeTab = 'mine';
          this.loadData();
        },
        error: (err) => {
          if (this.isClaimConflict(err)) {
            this.removePendingOrder(order.orderId);
            this.loadData();
            return;
          }
          this.toast.notify('Không thể nhận đơn: ' + getApiErrorMessage(err, 'Đơn có thể đã được staff khác nhận.'));
          this.isLoading = false;
        },
      });
    });
  }

  openOrderDetail(order: OrderListDTO): void {
    this.openOrderDetailById(order.id, order.staffName);
  }

  private openOrderDetailById(orderId: number, fallbackStaffName?: string | null): void {
    this.selectedOrder = null;
    this.detailLoading = true;
    this.orderService.getById(orderId).subscribe({
      next: (detail) => {
        this.selectedOrder = {
          ...detail,
          staffName: detail.staffName || fallbackStaffName || null,
        };
        this.detailLoading = false;
      },
      error: (err) => {
        this.toast.notify('Không thể tải chi tiết đơn hàng: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.detailLoading = false;
      },
    });
  }

  closeOrderDetail(): void {
    this.selectedOrder = null;
    this.detailLoading = false;
  }

  refreshSelectedOrder(): void {
    if (!this.selectedOrder?.id) return;
    this.orderService.getById(this.selectedOrder.id).subscribe({
      next: (detail) => {
        this.selectedOrder = {
          ...detail,
          staffName: detail.staffName || this.selectedOrder?.staffName || null,
        };
      },
    });
  }

  canStartProduction(order: Order | null): boolean {
    if (!order || order.status !== 'ORDER_ACCEPTED') return false;
    if (order.paymentMethod === 'COD') return true;
    if (order.paymentMethod === 'ONLINE') return order.paymentStatus === 'PAID';
    return false;
  }

  isOnlineWaitingPayment(order: Order | null): boolean {
    if (!order || order.status !== 'ORDER_ACCEPTED') return false;
    return order.paymentMethod === 'ONLINE' && order.paymentStatus !== 'PAID';
  }

  isPlannedStartOverdue(order: Order | null): boolean {
    if (!order?.plannedStartAt) return false;
    return Date.now() > new Date(order.plannedStartAt).getTime();
  }

  openStartProductionDialog(): void {
    if (!this.selectedOrder || !this.canStartProduction(this.selectedOrder)) return;
    this.lateStartReason = '';
    this.showStartProductionModal = true;
  }

  closeStartProductionDialog(): void {
    this.showStartProductionModal = false;
    this.lateStartReason = '';
  }

  confirmStartProduction(): void {
    if (!this.selectedOrder?.id || this.isStartingProduction) return;

    this.isStartingProduction = true;
    if (!this.startProductionKey) {
      this.startProductionKey = this.orderService.generateIdempotencyKey(
        'staff-start-production',
        this.selectedOrder.id
      );
    }

    const req = {
      orderVersion: this.selectedOrder.version ?? 0,
      lateStartReason: this.lateStartReason.trim() || undefined,
    };

    this.orderService.startProduction(this.selectedOrder.id, req, this.startProductionKey).subscribe({
      next: (res) => {
        this.isStartingProduction = false;
        this.startProductionKey = null;
        this.showStartProductionModal = false;

        if (this.selectedOrder) {
          this.selectedOrder.status = res.status;
          this.selectedOrder.productionStartedAt = res.productionStartedAt;
          this.selectedOrder.version = res.orderVersion;

          if (this.selectedOrder.items && res.itemDeadlines) {
            const deadlineMap = new Map(res.itemDeadlines.map((d) => [d.orderItemId, d]));
            this.selectedOrder.items.forEach((item) => {
              const itemId = item.id ?? item.orderItemId;
              if (itemId && deadlineMap.has(itemId)) {
                const d = deadlineMap.get(itemId)!;
                item.computedCompletionAt = d.computedCompletionAt;
                item.productionDurationDays = d.productionDurationDays;
              }
            });
          }
        }

        this.toast.notify(`Đã bắt đầu sản xuất đơn hàng #${res.orderId}!`);
        this.loadMyOrders();
      },
      error: (err) => {
        this.isStartingProduction = false;
        if (err?.status === 409 || err?.error?.errorCode === 'ORDER_VERSION_CONFLICT') {
          this.toast.notify('Dữ liệu đơn hàng đã thay đổi trên máy chủ, đang làm mới...');
          this.startProductionKey = null;
          this.refreshSelectedOrder();
          this.loadMyOrders();
        } else {
          const msg = err?.error?.errorCode === 'ORDER_NOT_READY_FOR_PRODUCTION'
            ? 'Đơn hàng chưa sẵn sàng để sản xuất (chưa hoàn tất thanh toán hoặc thỏa thuận).'
            : getApiErrorMessage(err, 'Không thể bắt đầu sản xuất. Vui lòng thử lại.');
          this.toast.notify(msg);
        }
      },
    });
  }

  openClaimableOrderDetail(order: OrderAssignmentQueueItem): void {
    this.selectedOrder = null;
    this.detailLoading = true;
    this.orderService.getById(order.orderId).subscribe({
      next: (detail) => {
        this.selectedOrder = detail;
        this.detailLoading = false;
      },
      error: (err) => {
        this.toast.notify('Không thể tải chi tiết đơn hàng: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.detailLoading = false;
      },
    });
  }

  private isClaimConflict(err: any): boolean {
    const payload = typeof err?.error === 'string'
      ? err.error
      : JSON.stringify(err?.error || err || {});
    return err?.status === 409
      || payload.includes('ORDER_ALREADY_ASSIGNED')
      || payload.toLowerCase().includes('already assigned');
  }

  private removePendingOrder(orderId: number): void {
    this.claimableOrders = this.claimableOrders.filter((item) => item.orderId !== orderId);
    this.pendingTotalElements = Math.max(0, this.pendingTotalElements - 1);
  }

  canShowCollaboration(order: Order | null): boolean {
    if (!order || this.activeTab !== 'mine') return false;
    const isGuest = !!order.customer?.guest || !!order.guestSessionId || (!order.userId && !order.user_id && !order.customer?.userId);
    if (isGuest) return false;
    const s = (order.status || '').toUpperCase();
    return s === 'DISCUSSING' || s === 'WAITING_STAFF_CONFIRMATION' || s === 'ORDER_ACCEPTED';
  }

  onCollaborationOrderUpdated(updated: Order): void {
    this.selectedOrder = updated;
    const idx = this.myOrders.findIndex((o) => o.id === updated.id);
    if (idx !== -1) {
      this.myOrders[idx] = {
        ...this.myOrders[idx],
        status: updated.status,
        version: updated.version,
      };
    }
  }
}
