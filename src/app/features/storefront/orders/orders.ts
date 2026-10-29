import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { inject as injectActionDialog } from '@angular/core';
import { ActionDialogService } from '../../../service/action-dialog.service';
import { inject as injectToast } from '@angular/core';
import { ToastService } from '../../../service/toast.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../service/auth.service';
import { OrderService } from '../../../service/order.service';
import { UserService } from '../../../service/user.service';
import {
  ItemCheckRequest,
  Order,
  OrderItem,
  OrderListDTO,
  OrderStatusHistory,
  ReceiptConfirmRequest,
  ReceiptConfirmResponse,
  ReceiptViewDTO,
  ReorderResponseDTO,
} from '../../../model/order.model';
import { UserInforDTO } from '../../../model/user.model';
import { getApiErrorMessage } from '../../../model/api-response.model';
import { OrderDetailPopupComponent } from '../../shared/order-detail-popup/order-detail-popup.component';
import { OrderPaymentModalComponent } from '../../shared/order-payment/order-payment-modal.component';
import { OrderTimelineModalComponent } from '../../shared/order-timeline/order-timeline-modal.component';
import { getOrderStatusLabel } from '../../shared/ui/order-status-badge/order-status.config';
import {
  AppPaginationComponent,
  OrderSummaryCardComponent,
  ViewStateComponent,
} from '../../shared/ui';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    OrderDetailPopupComponent,
    OrderPaymentModalComponent,
    OrderTimelineModalComponent,
    AppPaginationComponent,
    OrderSummaryCardComponent,
    ViewStateComponent,
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit {
  private readonly actionDialog = injectActionDialog(ActionDialogService);
  private readonly toast = injectToast(ToastService);
  orders: OrderListDTO[] = [];
  activeOrders: OrderListDTO[] = [];
  deliveredOrders: OrderListDTO[] = [];
  cancelledOrders: OrderListDTO[] = [];
  selectedOrderHistory: OrderStatusHistory[] = [];
  selectedOrderId: number | null = null;
  isLoadingTimeline = false;
  isTimelineModalOpen = false;
  modalOrders: OrderListDTO[] = [];
  modalTitle = '';
  isLoadingOrders = false;
  isLoadingCancelledOrders = false;
  reorderingOrderIds = new Set<number>();
  currentPage = 0;
  cancelledPage = 0;
  pageSize = 20;
  totalPages = 0;
  cancelledTotalPages = 0;
  totalElements = 0;
  cancelledTotalElements = 0;
  pageSizeOptions = [10, 20, 50, 100];
  readonly priceRanges = [
    { value: 'ALL', label: 'Tất cả mức giá', min: null, max: null },
    { value: 'UNDER_1M', label: 'Dưới 1 triệu', min: 0, max: 999_999 },
    { value: 'FROM_1M_TO_5M', label: 'Từ 1 đến 5 triệu', min: 1_000_000, max: 5_000_000 },
    { value: 'OVER_5M_TO_10M', label: 'Trên 5 đến 10 triệu', min: 5_000_001, max: 10_000_000 },
    { value: 'OVER_10M', label: 'Trên 10 triệu', min: 10_000_001, max: null },
  ];

  statusLabel(status: string | null | undefined): string {
    return getOrderStatusLabel(status);
  }
  selectedPriceRange = 'ALL';

  selectedOrderDetail: Order | null = null;
  isDetailLoading = false;
  detailError = '';

  receiptMode = false;
  isSubmittingReceipt = false;
  receiptError = '';
  currentReceiptView: ReceiptViewDTO | null = null;
  receivedQuantities: { [key: number]: number } = {};
  receiptResponse: ReceiptConfirmResponse | null = null;
  paymentModalOpen = false;
  payingOrder: Order | null = null;

  reorderResult: ReorderResponseDTO | null = null;
  showReorderModal = false;

  userInfo?: UserInforDTO;

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.authService.getUserId();
    if (id !== null) {
      this.loadMyOrders();
      this.loadCancelledOrders();
      this.loadUserInfo();
      this.route.queryParams.subscribe((params) => {
        const orderIdParam = params['orderId'];
        if (orderIdParam) {
          const orderId = Number(orderIdParam);
          if (!isNaN(orderId) && orderId > 0) {
            this.openOrderDetailById(orderId);
          }
        }
      });
    } else {
      console.error('Không tìm thấy ID người dùng. Hãy đăng nhập lại!');
    }
  }

  loadMyOrders(pageNumber: number = 0): void {
    this.isLoadingOrders = true;
    this.currentPage = pageNumber;
    const priceRange = this.getSelectedPriceRange();
    this.orderService.getMyOrders(
      this.currentPage,
      this.pageSize,
      priceRange.min,
      priceRange.max,
    ).subscribe({
      next: (page) => {
        this.orders = page.content || [];
        this.currentPage = page.number ?? pageNumber;
        this.pageSize = page.size || this.pageSize;
        this.totalPages = page.totalPages || 0;
        this.totalElements = page.totalElements || 0;
        this.applyOrderBuckets();
        this.isLoadingOrders = false;
      },
      error: (err) => {
        console.error('Lỗi khi tải đơn hàng:', err);
        this.isLoadingOrders = false;
      },
    });
  }

  changeOrdersPage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.loadMyOrders(page);
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.loadMyOrders(0);
    this.loadCancelledOrders(0);
  }

  onPriceRangeChange(): void {
    this.loadMyOrders(0);
    this.loadCancelledOrders(0);
  }

  private getSelectedPriceRange(): { min: number | null; max: number | null } {
    return this.priceRanges.find((range) => range.value === this.selectedPriceRange)
      ?? this.priceRanges[0];
  }

  private applyOrderBuckets(): void {
    this.activeOrders = this.orders.filter((order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED');
    this.deliveredOrders = this.orders.filter((order) => order.status === 'DELIVERED');

    if (this.modalTitle.includes('giao')) {
      this.modalOrders = this.deliveredOrders;
    }
  }

  loadUserInfo(): void {
    this.userService.getMe().subscribe({
      next: (res: any) => this.userInfo = res,
      error: (err) => console.error('Lỗi tải thông tin cá nhân', err),
    });
  }

  openHistoryModal(type: 'DELIVERED' | 'CANCELLED'): void {
    if (type === 'DELIVERED') {
      this.modalOrders = this.deliveredOrders;
      this.modalTitle = 'Lịch sử đơn hàng đã giao';
    } else {
      this.loadCancelledOrders();
      this.modalOrders = this.cancelledOrders;
      this.modalTitle = 'Lịch sử đơn hàng đã hủy';
    }
  }

  loadCancelledOrders(pageNumber: number = 0): void {
    this.isLoadingCancelledOrders = true;
    this.cancelledPage = pageNumber;
    const priceRange = this.getSelectedPriceRange();
    this.orderService.getMyCancelledOrders(
      this.cancelledPage,
      this.pageSize,
      priceRange.min,
      priceRange.max,
    ).subscribe({
      next: (page) => {
        this.cancelledOrders = page.content || [];
        this.cancelledPage = page.number ?? pageNumber;
        this.pageSize = page.size || this.pageSize;
        this.cancelledTotalPages = page.totalPages || 0;
        this.cancelledTotalElements = page.totalElements || 0;
        if (this.modalTitle.includes('hủy')) {
          this.modalOrders = this.cancelledOrders;
        }
        this.isLoadingCancelledOrders = false;
      },
      error: (err) => {
        this.toast.notify('Không thể tải đơn hàng đã hủy: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.isLoadingCancelledOrders = false;
      },
    });
  }

  changeCancelledPage(page: number): void {
    if (page < 0 || page >= this.cancelledTotalPages) return;
    this.loadCancelledOrders(page);
  }

  openOrderDetailById(orderId: number): void {
    this.hideHistoryModalIfOpen();
    this.receiptMode = false;
    this.resetReceiptState(false);
    this.selectedOrderDetail = null;
    this.detailError = '';
    this.isDetailLoading = true;

    this.orderService.getById(orderId).subscribe({
      next: (detail) => {
        this.selectedOrderDetail = detail;
        this.isDetailLoading = false;
      },
      error: (err) => {
        this.detailError = getApiErrorMessage(err, 'Không thể tải chi tiết đơn hàng.');
        this.isDetailLoading = false;
      },
    });
  }

  openOrderDetail(order: OrderListDTO): void {
    this.hideHistoryModalIfOpen();
    this.receiptMode = false;
    this.resetReceiptState(false);
    this.selectedOrderDetail = null;
    this.detailError = '';
    this.isDetailLoading = true;

    this.orderService.getById(order.id).subscribe({
      next: (detail) => {
        this.selectedOrderDetail = {
          ...detail,
          staffName: detail.staffName || order.staffName || null,
        };
        this.isDetailLoading = false;
      },
      error: (err) => {
        this.detailError = getApiErrorMessage(err, 'Không thể tải chi tiết đơn hàng.');
        this.isDetailLoading = false;
      },
    });
  }

  onOrderUpdated(): void {
    this.loadMyOrders();
    if (this.selectedOrderDetail?.id) {
      this.orderService.getById(this.selectedOrderDetail.id).subscribe({
        next: (detail) => {
          this.selectedOrderDetail = {
            ...detail,
            staffName: detail.staffName || this.selectedOrderDetail?.staffName || null,
          };
        },
      });
    }
  }

  openReceiptConfirm(order: OrderListDTO): void {
    this.hideHistoryModalIfOpen();
    this.receiptMode = true;
    this.resetReceiptState();
    this.selectedOrderDetail = null;
    this.detailError = '';
    this.isDetailLoading = true;
    this.currentReceiptView = null;

    this.orderService.getById(order.id).subscribe({
      next: (detail) => {
        this.selectedOrderDetail = {
          ...detail,
          staffName: detail.staffName || order.staffName || null,
        };
        this.orderService.getReceiptView(order.id).subscribe({
          next: (receiptView) => {
            this.currentReceiptView = receiptView;
            this.receivedQuantities = {};
            (receiptView.items || []).forEach((item) => {
              const qty = item.exportedQuantity ?? item.orderedQuantity ?? 0;
              this.receivedQuantities[item.orderItemId] = qty;
              if (item.variantId) {
                this.receivedQuantities[item.variantId] = qty;
              }
            });
            this.isDetailLoading = false;
          },
          error: (err) => {
            this.receiptError = getApiErrorMessage(err, 'Không thể tải thông tin xác nhận nhận hàng.');
            this.isDetailLoading = false;
          },
        });
      },
      error: (err) => {
        this.detailError = getApiErrorMessage(err, 'Không thể tải chi tiết đơn hàng.');
        this.isDetailLoading = false;
      },
    });
  }

  closeOrderDetail(): void {
    this.selectedOrderDetail = null;
    this.currentReceiptView = null;
    this.isDetailLoading = false;
    this.detailError = '';
    this.receiptMode = false;
    this.resetReceiptState();
  }

  submitReceiptConfirm(acceptMismatch: boolean = false): void {
    if (!this.selectedOrderDetail || !this.currentReceiptView) return;

    if (!this.currentReceiptView.canConfirmReceipt) {
      this.receiptError = 'Đơn hàng chưa ở trạng thái sẵn sàng để xác nhận nhận hàng.';
      return;
    }

    const items = this.currentReceiptView.items || [];
    const receivedItems: ItemCheckRequest[] = items.map((item) => ({
      orderItemId: item.orderItemId,
      receivedQuantity: Number(this.receivedQuantities[item.orderItemId] ?? item.exportedQuantity ?? item.orderedQuantity ?? 0),
    }));

    if (receivedItems.length === 0) {
      this.receiptError = 'Không có sản phẩm hợp lệ để xác nhận nhận hàng.';
      return;
    }

    const intentKey = this.orderService.generateIdempotencyKey(
      acceptMismatch ? 'user-receipt-mismatch' : 'user-receipt',
      this.currentReceiptView.orderId
    );

    this.isSubmittingReceipt = true;
    this.receiptError = '';

    const payload: ReceiptConfirmRequest = {
      orderVersion: this.currentReceiptView.orderVersion,
      receivedItems,
      acceptMismatch,
      note: null,
    };

    this.orderService.confirmReceipt(this.currentReceiptView.orderId, payload, intentKey).subscribe({
      next: (response) => {
        this.receiptResponse = response;
        this.isSubmittingReceipt = false;

        if (response.completed) {
          this.toast.notify(response.message || 'Xác nhận nhận hàng thành công!');
          this.closeOrderDetail();
          this.loadMyOrders();
          this.loadUserInfo();
          return;
        }

        this.receiptError = response.message || 'Số lượng thực nhận đang lệch so với số lượng xuất kho.';
      },
      error: (err) => {
        this.isSubmittingReceipt = false;
        if (err?.status === 409 || err?.error?.errorCode === 'ORDER_VERSION_CONFLICT') {
          this.toast.notify('Dữ liệu đơn hàng đã thay đổi trên máy chủ, đang làm mới...');
          if (this.selectedOrderDetail) {
            this.openReceiptConfirm({ id: this.selectedOrderDetail.id } as any);
          }
        } else {
          this.receiptError = getApiErrorMessage(err, 'Không thể xác nhận nhận hàng.');
        }
      },
    });
  }

  private resetReceiptState(clearQuantities: boolean = true): void {
    this.isSubmittingReceipt = false;
    this.receiptError = '';
    this.receiptResponse = null;
    if (clearQuantities) {
      this.receivedQuantities = {};
    }
  }

  calculateExpectedDeduction(totalPrice: number | null | undefined): number {
    if (totalPrice === null || totalPrice === undefined) return 0;
    if (totalPrice < 1000000) return 1;
    if (totalPrice <= 5000000) return 2;
    if (totalPrice <= 10000000) return 3;
    return 5;
  }

  canCancelOrder(order: OrderListDTO): boolean {
    return order.status === 'PENDING_APPROVAL';
  }

  canPayOrder(order: OrderListDTO): boolean {
    return (
      order.status === 'ORDER_ACCEPTED' &&
      order.paymentMethod === 'ONLINE' &&
      (order as any).paymentStatus !== 'PAID' &&
      (order as any).paymentStatus !== 'EXPIRED' &&
      (order as any).paymentStatus !== 'FAILED'
    );
  }

  openPaymentModal(order: OrderListDTO): void {
    this.orderService.getById(order.id).subscribe({
      next: (detail) => {
        this.payingOrder = detail;
        this.paymentModalOpen = true;
      },
      error: (err) => {
        this.toast.notify('Không thể tải thông tin đơn hàng để thanh toán: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
      },
    });
  }

  closePaymentModal(): void {
    this.paymentModalOpen = false;
    this.payingOrder = null;
  }

  onPaymentSuccess(): void {
    this.loadMyOrders();
    if (this.selectedOrderDetail) {
      this.onOrderUpdated();
    }
  }

  canReorderOrder(order: OrderListDTO): boolean {
    return order.status === 'DELIVERED' || order.status === 'CANCELLED';
  }

  isReorderingOrder(orderId: number): boolean {
    return this.reorderingOrderIds.has(orderId);
  }

  reorderOrder(order: OrderListDTO): void {
    if (!this.canReorderOrder(order) || this.reorderingOrderIds.has(order.id)) return;

    this.reorderingOrderIds.add(order.id);
    const key = this.orderService.generateIdempotencyKey('user-reorder', order.id);

    this.orderService.reorder(order.id, key).subscribe({
      next: (response) => {
        this.reorderingOrderIds.delete(order.id);
        if (response.orderType === 'CUSTOM' && response.customDraftId) {
          this.toast.notify('Đã tạo bản thảo yêu cầu đặt riêng mới từ đơn cũ.');
          this.router.navigate(['/store/custom-requests', response.customDraftId]);
          return;
        }

        // CATALOG orders: show result modal without auto redirect
        this.reorderResult = response;
        this.showReorderModal = true;
      },
      error: (err) => {
        this.reorderingOrderIds.delete(order.id);
        this.toast.notify(getApiErrorMessage(err, 'Không thể mua lại đơn hàng này.'));
      },
    });
  }

  closeReorderModal(): void {
    this.showReorderModal = false;
    this.reorderResult = null;
  }

  goToCart(): void {
    this.closeReorderModal();
    this.router.navigate(['/store/cart']);
  }

  cancelOrder(order: OrderListDTO): void {
    if (!this.canCancelOrder(order)) {
      this.toast.notify('Đơn hàng đã được xử lý nên không thể hủy.');
      return;
    }

    const currentRep = this.userInfo?.reputation ?? 0;
    const orderTotalPrice = order.finalPrice == null ? null : Number(order.finalPrice);
    const deduction = this.calculateExpectedDeduction(orderTotalPrice);
    this.actionDialog.prompt({
      title: 'Hủy đơn hàng',
      message: `Bạn đang yêu cầu hủy đơn hàng #${order.id}. Thao tác này có thể ảnh hưởng đến điểm uy tín.`,
      confirmText: 'Xác nhận hủy đơn',
      tone: 'danger',
      icon: 'bi-x-octagon-fill',
      details: [
        { label: 'Giá trị đơn', value: orderTotalPrice === null ? 'Chưa thỏa thuận giá' : `${orderTotalPrice.toLocaleString('vi-VN')} đ` },
        { label: 'Điểm uy tín hiện tại', value: `${currentRep} điểm` },
        { label: 'Điểm dự kiến bị trừ', value: deduction === 0 ? '0 điểm (không trừ)' : `-${deduction} điểm` },
        { label: 'Điểm còn lại dự kiến', value: `${Math.max(0, Number(currentRep) - deduction)} điểm` },
      ],
      input: {
        label: 'Lý do hủy đơn',
        placeholder: 'Nhập lý do cụ thể để chúng tôi cải thiện dịch vụ...',
        required: true,
        minLength: 5,
        maxLength: 500,
        hint: 'Lý do hủy đơn là bắt buộc và sẽ được lưu trong lịch sử đơn hàng.',
      },
    }).subscribe((reason) => {
      if (reason === null) return;
      this.orderService.cancelOrder(order.id, order.version ?? 0, reason).subscribe({
        next: () => {
          this.toast.notify('Hủy đơn hàng thành công!');
          this.loadMyOrders();
          this.loadCancelledOrders();
          this.loadUserInfo();
        },
        error: (err) => this.toast.notify('Không thể hủy đơn: ' + getApiErrorMessage(err, 'Không thể hủy đơn.')),
      });
    });
  }

  viewTimeline(orderId: number): void {
    this.selectedOrderId = orderId;
    this.selectedOrderHistory = [];
    this.isLoadingTimeline = true;
    this.isTimelineModalOpen = true;

    const order = this.orders.find((item) => item.id === orderId);

    this.orderService.getOrderHistory(orderId).subscribe({
      next: (data) => {
        const initialStep: OrderStatusHistory = {
          id: 0,
          oldstatus: '',
          newstatus: 'PENDING_APPROVAL',
          updatetime: order?.startOrderTime || new Date().toISOString(),
          changerId: 1,
        };

        this.selectedOrderHistory = [initialStep, ...data];
        this.isLoadingTimeline = false;
      },
      error: (err) => {
        this.toast.notify('Không thể tải lịch sử đơn hàng: ' + getApiErrorMessage(err, 'Không thể tải lịch sử đơn hàng.'));
        this.isLoadingTimeline = false;
      },
    });
  }

  private hideHistoryModalIfOpen(): void {
    const modalElement = document.getElementById('historyModal');
    if (!modalElement?.classList.contains('show')) {
      return;
    }

    const bootstrapModal = (window as any).bootstrap?.Modal?.getInstance(modalElement)
      || (window as any).bootstrap?.Modal?.getOrCreateInstance(modalElement);

    if (bootstrapModal) {
      bootstrapModal.hide();
      return;
    }

    modalElement.classList.remove('show');
    modalElement.setAttribute('aria-hidden', 'true');
    modalElement.removeAttribute('aria-modal');
    modalElement.style.display = 'none';
    document.body.classList.remove('modal-open');
    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.remove());
  }
}
