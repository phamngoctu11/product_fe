import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActionDialogService } from '../../../service/action-dialog.service';
import { ToastService } from '../../../service/toast.service';
import { FormsModule } from '@angular/forms';
import {
  Order,
  OrderAssignmentQueueItem,
  OrderItem,
  OrderListDTO,
  ShippingHandoverItemRequest,
  ShippingHandoverRequest,
  ShippingHandoverResponse,
} from '../../../model/order.model';
import { getApiErrorMessage } from '../../../model/api-response.model';
import { OrderService } from '../../../service/order.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
  private readonly router = inject(Router, { optional: true });
  claimableOrders: OrderAssignmentQueueItem[] = [];
  myOrders: OrderListDTO[] = [];
  activeTab: 'in_progress' | 'completed' | 'claimable' = 'in_progress';

  inProgressStatusFilter = 'ALL';
  completedStatusFilter = 'ALL';
  claimableFilter = 'ALL';

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

  chatOrder: Order | null = null;
  showChatModal = false;
  isChatOrderLoading = false;

  isStartingProduction = false;
  showStartProductionModal = false;
  startingOrder: Order | null = null;
  startProductionKey: string | null = null;

  isHandingOver = false;
  showHandoverModal = false;
  handoverOrder: Order | null = null;
  handoverQuantities: { [orderItemId: number]: number } = {};
  handoverNote = '';
  handoverKey: string | null = null;

  constructor(private orderService: OrderService) {}

  get inProgressOrders(): OrderListDTO[] {
    const active = this.myOrders.filter((o) => {
      const status = (o.status || '').toUpperCase();
      return !['DELIVERED', 'CANCELLED'].includes(status);
    });
    if (this.inProgressStatusFilter === 'ALL') {
      return active;
    }
    return active.filter((o) => (o.status || '').toUpperCase() === this.inProgressStatusFilter);
  }

  get completedOrders(): OrderListDTO[] {
    const finished = this.myOrders.filter((o) => {
      const status = (o.status || '').toUpperCase();
      return ['DELIVERED', 'CANCELLED'].includes(status);
    });
    if (this.completedStatusFilter === 'ALL') {
      return finished;
    }
    return finished.filter((o) => (o.status || '').toUpperCase() === this.completedStatusFilter);
  }

  get filteredClaimableOrders(): OrderAssignmentQueueItem[] {
    if (this.claimableFilter === 'ALL') {
      return this.claimableOrders;
    }
    return this.claimableOrders.filter((o) => (o.orderType || '').toUpperCase() === this.claimableFilter);
  }

  get totalInProgressCount(): number {
    return this.myOrders.filter((o) => !['DELIVERED', 'CANCELLED'].includes((o.status || '').toUpperCase())).length;
  }

  get totalCompletedCount(): number {
    return this.myOrders.filter((o) => ['DELIVERED', 'CANCELLED'].includes((o.status || '').toUpperCase())).length;
  }

  ngOnInit(): void {
    this.loadData();
    this.route.queryParams.subscribe((params) => {
      const orderId = Number(params['orderId']);
      if (Number.isInteger(orderId) && orderId > 0) {
        this.activeTab = 'in_progress';
        if (params['action'] === 'chat' || params['chat'] === 'true') {
          this.openOrderChatById(orderId);
        } else {
          this.openOrderDetailById(orderId);
        }
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
          this.activeTab = 'in_progress';
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

  openOrderChat(order: OrderListDTO | Order): void {
    if (this.router) {
      this.router.navigate(['/management/staff-custom-orders'], { queryParams: { orderId: order.id } });
    }
    this.openOrderChatById(order.id, (order as any).staffName);
  }

  openOrderChatById(orderId: number, fallbackStaffName?: string | null): void {
    if (!orderId) return;
    this.showChatModal = true;
    this.isChatOrderLoading = true;
    this.chatOrder = null;
    this.orderService.getById(orderId).subscribe({
      next: (detail) => {
        this.chatOrder = {
          ...detail,
          staffName: detail.staffName || fallbackStaffName || null,
        };
        this.isChatOrderLoading = false;
      },
      error: (err) => {
        this.toast.notify('Không thể tải thông tin đơn hàng để mở chat: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.isChatOrderLoading = false;
        this.showChatModal = false;
      },
    });
  }

  closeOrderChat(): void {
    this.showChatModal = false;
    this.chatOrder = null;
    this.isChatOrderLoading = false;
  }

  switchToFullDetailFromChat(): void {
    const order = this.chatOrder;
    this.closeOrderChat();
    if (order) {
      this.selectedOrder = order;
    }
  }

  scrollToSection(sectionId: string): void {
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  openOrderDetail(order: OrderListDTO | Order): void {
    this.openOrderDetailById(order.id, (order as any).staffName);
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
    this.showStartProductionModal = false;
    this.startingOrder = null;
    this.showHandoverModal = false;
    this.handoverOrder = null;
    this.handoverKey = null;
  }

  refreshSelectedOrder(): void {
    const targetId = this.selectedOrder?.id || this.chatOrder?.id;
    if (!targetId) return;
    this.orderService.getById(targetId).subscribe({
      next: (detail) => {
        if (this.selectedOrder?.id === targetId) {
          this.selectedOrder = {
            ...detail,
            staffName: detail.staffName || this.selectedOrder?.staffName || null,
          };
        }
        if (this.chatOrder?.id === targetId) {
          this.chatOrder = {
            ...detail,
            staffName: detail.staffName || this.chatOrder?.staffName || null,
          };
        }
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

  openStartProductionDialog(): void {
    if (!this.selectedOrder || !this.canStartProduction(this.selectedOrder)) return;
    this.startingOrder = this.selectedOrder;
    this.showStartProductionModal = true;
  }

  closeStartProductionDialog(): void {
    this.showStartProductionModal = false;
    this.startingOrder = null;
  }

  confirmStartProduction(): void {
    const order = this.startingOrder || this.selectedOrder;
    if (!order?.id || this.isStartingProduction) return;

    this.isStartingProduction = true;
    if (!this.startProductionKey) {
      this.startProductionKey = this.orderService.generateIdempotencyKey(
        'staff-start-production',
        order.id
      );
    }

    this.orderService.startProduction(order.id, this.startProductionKey).subscribe({
      next: (res) => {
        this.isStartingProduction = false;
        this.startProductionKey = null;
        this.showStartProductionModal = false;
        this.startingOrder = null;

        if (this.selectedOrder && this.selectedOrder.id === res.orderId) {
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

  canHandoverShipping(order: Order | OrderListDTO | null): boolean {
    if (!order) return false;
    return (order.status || '').toUpperCase() === 'READY_TO_SHIP';
  }

  canShowChangeRequests(order: Order | null): boolean {
    if (!order || this.activeTab === 'claimable') return false;
    return ['ORDER_ACCEPTED', 'ORDER_CREATING'].includes((order.status || '').toUpperCase());
  }

  openShippingHandoverDialog(order?: Order | OrderListDTO | null): void {
    const target = order || this.selectedOrder;
    if (!target || !this.canHandoverShipping(target)) return;

    if (!('items' in target) || !target.items) {
      this.orderService.getById(target.id).subscribe({
        next: (detail) => {
          this.selectedOrder = detail;
          this.setupHandoverModal(detail);
        },
        error: (err) => {
          this.toast.notify('Không thể tải thông tin đơn hàng: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        },
      });
      return;
    }

    this.setupHandoverModal(target as Order);
  }

  getHandoverItemKey(item: OrderItem): number {
    return Number(item.orderItemId || item.id || 0);
  }

  private setupHandoverModal(order: Order): void {
    this.handoverOrder = order;
    this.handoverNote = '';
    this.handoverQuantities = {};
    this.handoverKey = null;

    const items = order.items || order.orderItems || order.details || [];
    items.forEach((item) => {
      const itemId = Number(item.orderItemId || item.id);
      this.handoverQuantities[itemId] = Number(item.quantity || 0);
    });

    this.showHandoverModal = true;
  }

  closeShippingHandoverDialog(): void {
    this.showHandoverModal = false;
    this.handoverOrder = null;
    this.handoverQuantities = {};
    this.handoverNote = '';
    this.handoverKey = null;
    this.isHandingOver = false;
  }

  confirmShippingHandover(): void {
    const order = this.handoverOrder || this.selectedOrder;
    if (!order?.id || this.isHandingOver) return;

    const items = order.items || order.orderItems || order.details || [];
    if (items.length === 0) {
      this.toast.notify('Đơn hàng không có sản phẩm để bàn giao.');
      return;
    }

    for (const item of items) {
      const itemId = Number(item.orderItemId || item.id);
      const qty = this.handoverQuantities[itemId];
      if (qty === undefined || qty === null || qty < 0 || qty > item.quantity) {
        this.toast.notify(`Số lượng xuất kho của ${item.productName || 'sản phẩm'} phải từ 0 đến ${item.quantity}.`);
        return;
      }
    }

    if (!this.handoverKey) {
      this.handoverKey = this.orderService.generateIdempotencyKey(
        'staff-shipping-handover',
        order.id
      );
    }

    const payloadItems: ShippingHandoverItemRequest[] = items.map((item) => ({
      orderItemId: Number(item.orderItemId || item.id),
      exportedQuantity: Number(this.handoverQuantities[Number(item.orderItemId || item.id)] ?? item.quantity),
    }));

    const req: ShippingHandoverRequest = {
      orderVersion: order.version ?? 0,
      items: payloadItems,
      handoverNote: this.handoverNote.trim() || undefined,
    };

    this.isHandingOver = true;
    this.orderService.shippingHandover(order.id, req, this.handoverKey).subscribe({
      next: (res) => {
        this.isHandingOver = false;
        this.closeShippingHandoverDialog();

        if (this.selectedOrder && this.selectedOrder.id === res.orderId) {
          this.selectedOrder.status = res.status;
          this.selectedOrder.version = res.orderVersion;
        }

        const msg = res.expectedDeliveryAt
          ? `Bàn giao vận chuyển thành công đơn #${res.orderId}! Dự kiến giao lúc ${new Date(res.expectedDeliveryAt).toLocaleString('vi-VN')}.`
          : `Bàn giao vận chuyển thành công đơn #${res.orderId}!`;
        this.toast.notify(msg);
        this.loadMyOrders();
        this.refreshSelectedOrder();
      },
      error: (err) => {
        this.isHandingOver = false;
        if (err?.status === 409 || err?.error?.errorCode === 'ORDER_VERSION_CONFLICT') {
          this.toast.notify('Dữ liệu đơn hàng đã thay đổi trên máy chủ, đang làm mới...');
          this.handoverKey = null;
          this.refreshSelectedOrder();
          this.loadMyOrders();
          this.closeShippingHandoverDialog();
        } else {
          this.toast.notify(getApiErrorMessage(err, 'Không thể bàn giao vận chuyển. Vui lòng thử lại.'));
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
    if (!order || this.activeTab === 'claimable') return false;
    const isGuest = !!order.customer?.guest || !!order.guestSessionId || (!order.userId && !order.user_id && !order.customer?.userId);
    if (isGuest && order.orderType !== 'CUSTOM') return false;
    const s = (order.status || '').toUpperCase();
    return s === 'DISCUSSING' || s === 'WAITING_STAFF_CONFIRMATION' || s === 'ORDER_ACCEPTED' || s === 'ORDER_CREATING';
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
