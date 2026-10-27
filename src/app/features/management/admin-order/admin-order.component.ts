import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AvailableStaff,
  ManagerOrderReviewDetail,
  ManagerOrderReviewSummary,
  Order,
  OrderAssignmentQueueItem,
} from '../../../model/order.model';
import { getApiErrorMessage } from '../../../model/api-response.model';
import { formatOrderAttributes } from '../../../model/order-display';
import {
  OrderItemProductionDTO,
  ReviewProductionCheckpointResultDTO,
} from '../../../model/production-checkpoint.model';
import { ActionDialogService } from '../../../service/action-dialog.service';
import { OrderService } from '../../../service/order.service';
import { ProductionCheckpointService } from '../../../service/production-checkpoint.service';
import { ToastService } from '../../../service/toast.service';
import {
  AppPaginationComponent,
  OrderStatusBadgeComponent,
  PageHeaderComponent,
  ViewStateComponent,
} from '../../shared/ui';
import { ManagerKcsDialogComponent } from '../../shared/production-checkpoint/manager-kcs-dialog.component';
import { getOrderTypeLabel } from '../../shared/ui/order-status-badge/order-status.config';

export type ManagerOrderTab = 'reviews' | 'assignments' | 'kcs';

@Component({
  selector: 'app-admin-order',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppPaginationComponent,
    OrderStatusBadgeComponent,
    PageHeaderComponent,
    ViewStateComponent,
    ManagerKcsDialogComponent,
  ],
  templateUrl: './admin-order.component.html',
  styleUrl: './admin-order.component.css',
})
export class AdminOrderComponent implements OnInit {
  private readonly actionDialog = inject(ActionDialogService);
  private readonly orderService = inject(OrderService);
  private readonly checkpointService = inject(ProductionCheckpointService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  activeTab: ManagerOrderTab = 'reviews';

  orderTypeLabel(type: string | null | undefined): string {
    return getOrderTypeLabel(type);
  }

  itemVariantLabel(item: { variantName?: string | null; attributes?: unknown }): string {
    return item.variantName || formatOrderAttributes(item.attributes) || 'Không có phân loại';
  }
  reviews: ManagerOrderReviewSummary[] = [];
  assignmentQueue: OrderAssignmentQueueItem[] = [];
  availableStaff: AvailableStaff[] = [];
  selectedStaffByOrder: Record<number, string | null> = {};

  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  totalElements = 0;
  readonly pageSizeOptions = [10, 20, 50, 100];

  isLoading = false;
  processingOrderId: number | null = null;
  selectedDetail: ManagerOrderReviewDetail | null = null;
  detailLoading = false;
  detailError = '';

  kcsOrderId: number | null = null;
  isKcsDialogOpen = false;

  quickKcsOrderId: number | null = null;
  lookupOrderId: number | null = null;
  kcsOrder: Order | null = null;
  kcsItemsProgress: OrderItemProductionDTO[] = [];
  isKcsSearching = false;
  kcsSearchError = '';
  recentKcsOrderIds: number[] = [];
  previewImageUrl: string | null = null;

  ngOnInit(): void {
    this.loadAvailableStaff();
    this.loadRecentKcsOrders();

    this.route.queryParams.subscribe((params) => {
      const tabParam = params['tab'];
      if (tabParam === 'kcs' || tabParam === 'reviews' || tabParam === 'assignments') {
        this.activeTab = tabParam;
      }

      const orderIdParam = params['orderId'];
      if (orderIdParam) {
        const orderId = Number(orderIdParam);
        if (!isNaN(orderId) && orderId > 0) {
          this.lookupOrderId = orderId;
          if (this.activeTab === 'kcs') {
            this.searchKcsOrder(orderId);
          } else {
            this.openKcsReview(orderId);
          }
        }
      } else {
        this.loadCurrentTab();
      }
    });
  }

  openKcsReview(orderId: number): void {
    this.kcsOrderId = orderId;
    this.isKcsDialogOpen = true;
    this.addRecentKcsOrder(orderId);
  }

  closeKcsDialog(): void {
    this.isKcsDialogOpen = false;
    this.kcsOrderId = null;
  }

  onKcsReviewed(result: ReviewProductionCheckpointResultDTO): void {
    if (this.selectedDetail?.order && this.selectedDetail.order.id === result.orderId) {
      this.selectedDetail.order.status = result.orderStatus;
      this.selectedDetail.order.version = result.orderVersion;
    }
    if (this.kcsOrder && this.kcsOrder.id === result.orderId) {
      this.kcsOrder.status = result.orderStatus;
      this.kcsOrder.version = result.orderVersion;
      this.checkpointService.getProgress(result.orderId).subscribe({
        next: (items) => {
          this.kcsItemsProgress = items || [];
        },
      });
    }
  }

  quickCheckKcs(): void {
    if (!this.quickKcsOrderId || this.quickKcsOrderId <= 0) {
      this.toast.notify('Vui lòng nhập mã đơn hàng cần kiểm định KCS.');
      return;
    }
    this.openKcsReview(this.quickKcsOrderId);
  }

  searchKcsOrder(orderIdInput?: number): void {
    const targetId = orderIdInput ?? this.lookupOrderId;
    if (!targetId || targetId <= 0) {
      this.toast.notify('Vui lòng nhập mã đơn hàng hợp lệ.');
      return;
    }

    this.lookupOrderId = targetId;
    this.isKcsSearching = true;
    this.kcsSearchError = '';
    this.kcsOrder = null;
    this.kcsItemsProgress = [];

    this.orderService.getById(targetId).subscribe({
      next: (order) => {
        this.kcsOrder = order;
        this.addRecentKcsOrder(targetId);
        this.checkpointService.getProgress(targetId).subscribe({
          next: (checkpoints) => {
            this.kcsItemsProgress = checkpoints || [];
            this.isKcsSearching = false;
          },
          error: () => {
            this.kcsItemsProgress = [];
            this.isKcsSearching = false;
          },
        });
      },
      error: (err) => {
        this.isKcsSearching = false;
        this.kcsSearchError = getApiErrorMessage(err, `Không tìm thấy đơn hàng #${targetId} hoặc bạn không có quyền truy cập.`);
      },
    });
  }

  clearKcsSearch(): void {
    this.lookupOrderId = null;
    this.kcsOrder = null;
    this.kcsItemsProgress = [];
    this.kcsSearchError = '';
  }

  openLightbox(url: string): void {
    this.previewImageUrl = url;
  }

  closeLightbox(): void {
    this.previewImageUrl = null;
  }

  getPendingKcsCount(): number {
    return this.kcsItemsProgress.reduce((acc, item) => {
      const hasPending = (item.checkpoints || []).some(
        (cp) => cp.stage === 'FINAL_PRODUCT' && cp.status === 'PENDING_REVIEW'
      );
      return acc + (hasPending ? 1 : 0);
    }, 0);
  }

  getCompletedKcsCount(): number {
    return this.kcsItemsProgress.reduce((acc, item) => {
      const isReady = item.productionStatus === 'READY';
      return acc + (isReady ? 1 : 0);
    }, 0);
  }

  getItemStatusBadgeClass(status: string): string {
    switch (status) {
      case 'READY':
        return 'badge-success';
      case 'FINAL_WAITING_QC':
        return 'badge-warning';
      case 'FINAL_REWORK_REQUIRED':
        return 'badge-danger';
      case 'FINAL_IN_PROGRESS':
      case 'INITIAL_IN_PROGRESS':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  }

  getItemStatusLabel(status: string): string {
    switch (status) {
      case 'WAITING_ASSIGNMENT':
        return 'Chờ phân công';
      case 'ASSIGNED':
        return 'Đã phân công';
      case 'INITIAL_IN_PROGRESS':
        return 'Đang tạo dáng';
      case 'FINAL_IN_PROGRESS':
        return 'Đang làm hoàn thiện';
      case 'FINAL_WAITING_QC':
        return 'Chờ KCS kiểm định';
      case 'FINAL_REWORK_REQUIRED':
        return 'Yêu cầu làm lại';
      case 'READY':
        return 'Đạt chuẩn KCS';
      default:
        return status;
    }
  }

  private loadRecentKcsOrders(): void {
    try {
      const raw = localStorage.getItem('recent_kcs_orders');
      if (raw) {
        this.recentKcsOrderIds = JSON.parse(raw).filter((id: unknown) => typeof id === 'number' && id > 0);
      }
    } catch {
      this.recentKcsOrderIds = [];
    }
  }

  private addRecentKcsOrder(orderId: number): void {
    this.recentKcsOrderIds = [orderId, ...this.recentKcsOrderIds.filter((id) => id !== orderId)].slice(0, 8);
    try {
      localStorage.setItem('recent_kcs_orders', JSON.stringify(this.recentKcsOrderIds));
    } catch {}
  }

  selectTab(tab: ManagerOrderTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.currentPage = 0;
    this.loadCurrentTab();
  }

  loadCurrentTab(): void {
    if (this.activeTab === 'reviews') {
      this.loadReviews();
    } else if (this.activeTab === 'assignments') {
      this.loadAssignmentQueue();
    } else if (this.activeTab === 'kcs') {
      if (this.lookupOrderId) {
        this.searchKcsOrder(this.lookupOrderId);
      }
    }
  }

  loadReviews(): void {
    this.isLoading = true;
    this.orderService.getManagerReviews(this.currentPage, this.pageSize).subscribe({
      next: (page) => {
        this.reviews = page.content || [];
        this.applyPage(page.number, page.size, page.totalPages, page.totalElements);
        this.isLoading = false;
      },
      error: (error) => this.handleListError(error, 'Không thể tải danh sách đơn chờ duyệt.'),
    });
  }

  loadAssignmentQueue(): void {
    this.isLoading = true;
    this.orderService.getManagerAssignmentQueue(this.currentPage, this.pageSize).subscribe({
      next: (page) => {
        this.assignmentQueue = page.content || [];
        this.applyPage(page.number, page.size, page.totalPages, page.totalElements);
        this.isLoading = false;
      },
      error: (error) => this.handleListError(error, 'Không thể tải danh sách đơn chờ phân công.'),
    });
  }

  loadAvailableStaff(page = 0, accumulated: AvailableStaff[] = []): void {
    this.orderService.getAvailableStaff(page, 50).subscribe({
      next: (page) => {
        const available = [
          ...accumulated,
          ...(page.content || []).filter((staff) => staff.available),
        ];
        if (page.number + 1 < page.totalPages) {
          this.loadAvailableStaff(page.number + 1, available);
          return;
        }
        this.availableStaff = available;
      },
      error: (error) => {
        this.availableStaff = [];
        this.toast.notify('Không thể tải danh sách staff: ' + getApiErrorMessage(error, 'Vui lòng thử lại.'));
      },
    });
  }

  changePage(page: number): void {
    if (page < 0 || page >= this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadCurrentTab();
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.loadCurrentTab();
  }

  approveOrder(order: ManagerOrderReviewSummary): void {
    const staffId = this.selectedStaffByOrder[order.orderId] || null;
    const suffix = staffId
      ? ' Đơn sẽ được chuyển thẳng cho staff đã chọn.'
      : ' Đơn sẽ chuyển sang hàng đợi phân công.';

    this.actionDialog.confirm({
      title: 'Duyệt đơn hàng',
      message: `Xác nhận duyệt đơn #${order.orderId}?${suffix}`,
      confirmText: 'Duyệt đơn',
      icon: 'bi-check-circle',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.processingOrderId = order.orderId;
      this.orderService.reviewOrder(order.orderId, {
        orderVersion: order.orderVersion,
        approved: true,
        staffId,
      }).subscribe({
        next: (result) => {
          this.toast.notify(`Đã duyệt đơn #${order.orderId} – trạng thái ${result.orderStatus}.`);
          this.processingOrderId = null;
          this.refreshAfterMutation();
        },
        error: (error) => this.handleMutationError(error, 'Không thể duyệt đơn.'),
      });
    });
  }

  rejectOrder(order: ManagerOrderReviewSummary): void {
    this.actionDialog.prompt({
      title: 'Từ chối đơn hàng',
      message: `Nhập lý do từ chối đơn #${order.orderId}.`,
      confirmText: 'Từ chối đơn',
      tone: 'danger',
      icon: 'bi-x-circle',
      input: {
        label: 'Lý do từ chối',
        placeholder: 'Ví dụ: thông tin sản phẩm chưa đầy đủ',
        required: true,
        maxLength: 500,
      },
    }).subscribe((reason) => {
      const rejectionReason = reason?.trim();
      if (!rejectionReason) return;
      this.processingOrderId = order.orderId;
      this.orderService.reviewOrder(order.orderId, {
        orderVersion: order.orderVersion,
        approved: false,
        reason: rejectionReason,
      }).subscribe({
        next: () => {
          this.toast.notify(`Đã từ chối đơn #${order.orderId}.`);
          this.processingOrderId = null;
          this.refreshAfterMutation();
        },
        error: (error) => this.handleMutationError(error, 'Không thể từ chối đơn.'),
      });
    });
  }

  assignStaff(order: OrderAssignmentQueueItem): void {
    const staffId = this.selectedStaffByOrder[order.orderId];
    if (!staffId) {
      this.toast.notify('Vui lòng chọn staff trước khi phân công.');
      return;
    }

    const staff = this.availableStaff.find((item) => item.staffId === staffId);
    this.actionDialog.confirm({
      title: 'Phân công staff',
      message: `Phân công đơn #${order.orderId} cho ${staff?.displayName || 'staff đã chọn'}?`,
      confirmText: 'Phân công',
      icon: 'bi-person-check',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.processingOrderId = order.orderId;
      this.orderService.assignStaff(order.orderId, order.orderVersion, staffId).subscribe({
        next: (result) => {
          this.toast.notify(`Đã phân công đơn #${order.orderId} – trạng thái ${result.orderStatus}.`);
          this.processingOrderId = null;
          delete this.selectedStaffByOrder[order.orderId];
          this.refreshAfterMutation();
        },
        error: (error) => this.handleMutationError(error, 'Không thể phân công staff.'),
      });
    });
  }

  openReviewDetail(order: ManagerOrderReviewSummary): void {
    this.openReviewDetailById(order.orderId);
  }

  openAssignmentDetail(order: OrderAssignmentQueueItem): void {
    this.detailLoading = true;
    this.detailError = '';
    this.selectedDetail = null;
    this.orderService.getById(order.orderId).subscribe({
      next: (detail) => {
        this.selectedDetail = { order: detail };
        this.detailLoading = false;
      },
      error: (error) => this.handleDetailError(error),
    });
  }

  closeDetail(): void {
    this.selectedDetail = null;
    this.detailLoading = false;
    this.detailError = '';
  }

  getOrderItems(order: Order): NonNullable<Order['items']> {
    return order.items || order.orderItems || order.details || [];
  }

  private openReviewDetailById(orderId: number): void {
    this.detailLoading = true;
    this.detailError = '';
    this.selectedDetail = null;
    this.orderService.getManagerReviewDetail(orderId).subscribe({
      next: (detail) => {
        this.selectedDetail = detail;
        this.detailLoading = false;
      },
      error: (error) => this.handleDetailError(error),
    });
  }

  private refreshAfterMutation(): void {
    if (this.currentPage > 0 && this.totalElements % this.pageSize === 1) {
      this.currentPage--;
    }
    this.loadAvailableStaff();
    this.loadCurrentTab();
  }

  private applyPage(number: number, size: number, totalPages: number, totalElements: number): void {
    this.currentPage = number ?? 0;
    this.pageSize = size || this.pageSize;
    this.totalPages = totalPages || 0;
    this.totalElements = totalElements || 0;
  }

  private handleListError(error: unknown, fallback: string): void {
    this.isLoading = false;
    this.toast.notify(getApiErrorMessage(error, fallback));
  }

  private handleDetailError(error: unknown): void {
    this.detailLoading = false;
    this.detailError = getApiErrorMessage(error, 'Không thể tải chi tiết đơn hàng.');
  }

  private handleMutationError(error: unknown, fallback: string): void {
    this.processingOrderId = null;
    const message = getApiErrorMessage(error, fallback);
    this.toast.notify(message);
    this.loadCurrentTab();
  }
}
