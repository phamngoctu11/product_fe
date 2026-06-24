import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { inject as injectActionDialog } from '@angular/core';
import { ActionDialogService } from '../../service/action-dialog.service';
import { inject as injectToast } from '@angular/core';
import { ToastService } from '../../service/toast.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../service/auth.service';
import { OrderService } from '../../service/order.service';
import { UserService } from '../../service/user.service';
import {
  ItemCheckRequest,
  Order,
  OrderItem,
  OrderListDTO,
  OrderStatusHistory,
  ReceiptConfirmResponse,
} from '../../model/order.model';
import { UserInforDTO } from '../../model/user.model';
import { getApiErrorMessage } from '../../model/api-response.model';
import { OrderDetailPopupComponent } from '../order-detail-popup/order-detail-popup.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, OrderDetailPopupComponent],
  templateUrl: './orders.html',
  styleUrls: ['../../app.css', './orders.css'],
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
  modalOrders: OrderListDTO[] = [];
  modalTitle = '';
  isLoadingOrders = false;
  isLoadingMoreOrders = false;
  isLoadingCancelledOrders = false;
  currentPage = 0;
  cancelledPage = 0;
  pageSize = 20;
  totalPages = 0;
  cancelledTotalPages = 0;

  selectedOrderDetail: Order | null = null;
  isDetailLoading = false;
  detailError = '';

  receiptMode = false;
  isSubmittingReceipt = false;
  receiptError = '';
  receivedQuantities: { [variantId: number]: number } = {};
  receiptResponse: ReceiptConfirmResponse | null = null;
  complaintNote = '';

  userId!: number;
  userInfo?: UserInforDTO;

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    const id = this.authService.getUserId();
    if (id !== null) {
      this.userId = id;
      this.loadMyOrders();
      this.loadCancelledOrders();
      this.loadUserInfo();
    } else {
      console.error('Không tìm thấy ID người dùng. Hãy đăng nhập lại!');
    }
  }

  loadMyOrders(): void {
    this.isLoadingOrders = true;
    this.currentPage = 0;
    this.orderService.getOrdersByUserId(this.userId, this.currentPage, this.pageSize).subscribe({
      next: (page) => {
        this.orders = page.content || [];
        this.totalPages = page.totalPages || 0;
        this.applyOrderBuckets();
        this.isLoadingOrders = false;
      },
      error: (err) => {
        console.error('Lỗi khi tải đơn hàng:', err);
        this.isLoadingOrders = false;
      },
    });
  }

  loadMoreOrders(): void {
    if (this.isLoadingMoreOrders || this.currentPage + 1 >= this.totalPages) return;

    this.isLoadingMoreOrders = true;
    this.orderService.getOrdersByUserId(this.userId, this.currentPage + 1, this.pageSize).subscribe({
      next: (page) => {
        this.orders = [...this.orders, ...(page.content || [])];
        this.currentPage = page.number ?? this.currentPage + 1;
        this.totalPages = page.totalPages || 0;
        this.applyOrderBuckets();
        this.isLoadingMoreOrders = false;
      },
      error: (err) => {
        this.toast.notify('Không thể tải thêm đơn hàng: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        this.isLoadingMoreOrders = false;
      },
    });
  }

  hasMoreOrders(): boolean {
    return this.currentPage + 1 < this.totalPages;
  }

  private applyOrderBuckets(): void {
    this.activeOrders = this.orders.filter((order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED');
    this.deliveredOrders = this.orders.filter((order) => order.status === 'DELIVERED');

    if (this.modalTitle.includes('giao')) {
      this.modalOrders = this.deliveredOrders;
    }
  }

  loadUserInfo(): void {
    this.userService.getById(this.userId).subscribe({
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

  loadCancelledOrders(): void {
    this.isLoadingCancelledOrders = true;
    this.cancelledPage = 0;
    this.orderService.getCancelledOrdersByUserId(this.userId, this.cancelledPage, this.pageSize).subscribe({
      next: (page) => {
        this.cancelledOrders = page.content || [];
        this.cancelledTotalPages = page.totalPages || 0;
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

  openOrderDetail(order: OrderListDTO): void {
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

  openReceiptConfirm(order: OrderListDTO): void {
    this.receiptMode = true;
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
        (this.selectedOrderDetail.items || []).forEach((item) => {
          const variantId = this.getReceiptVariantId(item);
          if (variantId) {
            this.receivedQuantities[variantId] = Number(item.exportedQuantity ?? item.quantity ?? 0);
          }
        });
        this.isDetailLoading = false;
      },
      error: (err) => {
        this.detailError = getApiErrorMessage(err, 'Không thể tải chi tiết đơn hàng.');
        this.isDetailLoading = false;
      },
    });
  }

  closeOrderDetail(): void {
    this.selectedOrderDetail = null;
    this.isDetailLoading = false;
    this.detailError = '';
    this.receiptMode = false;
    this.resetReceiptState();
  }

  submitReceiptConfirm(acceptMismatch: boolean = false): void {
    if (!this.selectedOrderDetail) return;

    const receivedItems = this.buildReceivedItemsPayload();
    if (receivedItems.length === 0) {
      this.receiptError = 'Không có item hợp lệ để xác nhận nhận hàng.';
      return;
    }

    this.isSubmittingReceipt = true;
    this.receiptError = '';
    this.orderService.confirmReceipt(this.selectedOrderDetail.id, { receivedItems, acceptMismatch }).subscribe({
      next: (response) => {
        this.receiptResponse = response;
        this.isSubmittingReceipt = false;

        if (response.confirmed) {
          this.toast.notify(response.message || 'Xác nhận nhận hàng thành công!');
          this.closeOrderDetail();
          this.loadMyOrders();
          this.loadUserInfo();
          return;
        }

        this.receiptError = response.message || 'Số lượng thực nhận đang lệch so với số lượng xuất kho.';
      },
      error: (err) => {
        this.receiptError = getApiErrorMessage(err, 'Không thể xác nhận nhận hàng.');
        this.isSubmittingReceipt = false;
      },
    });
  }

  sendReceiptComplaint(): void {
    if (!this.selectedOrderDetail) return;

    const receivedItems = this.buildReceivedItemsPayload();
    if (receivedItems.length === 0) {
      this.receiptError = 'Không có item hợp lệ để gửi khiếu nại.';
      return;
    }

    this.isSubmittingReceipt = true;
    this.receiptError = '';
    this.orderService.sendReceiptComplaint(this.selectedOrderDetail.id, {
      receivedItems,
      note: this.complaintNote.trim(),
    }).subscribe({
      next: (response) => {
        this.receiptResponse = response;
        this.isSubmittingReceipt = false;
        this.toast.notify(response.message || 'Đã gửi khiếu nại cho manager.');
        this.closeOrderDetail();
      },
      error: (err) => {
        this.receiptError = getApiErrorMessage(err, 'Không thể gửi khiếu nại.');
        this.isSubmittingReceipt = false;
      },
    });
  }

  getReceiptVariantId(item: OrderItem): number {
    return Number(item.variantId || item.productVariantId || 0);
  }

  private buildReceivedItemsPayload(): ItemCheckRequest[] {
    if (!this.selectedOrderDetail?.items?.length) return [];

    return this.selectedOrderDetail.items.map((item) => {
      const variantId = this.getReceiptVariantId(item);
      return {
        variantId,
        quantity: Number(this.receivedQuantities[variantId] ?? 0),
      };
    }).filter((item) => item.variantId > 0 && item.quantity >= 0);
  }

  private resetReceiptState(clearQuantities: boolean = true): void {
    this.isSubmittingReceipt = false;
    this.receiptError = '';
    this.receiptResponse = null;
    this.complaintNote = '';
    if (clearQuantities) {
      this.receivedQuantities = {};
    }
  }

  calculateExpectedDeduction(totalPrice: number): number {
    if (totalPrice < 1000000) return 1;
    if (totalPrice <= 5000000) return 2;
    if (totalPrice <= 10000000) return 3;
    return 5;
  }

  canCancelOrder(order: OrderListDTO): boolean {
    return order.status === 'PENDING_PAYMENT' || order.status === 'PENDING_APPROVAL';
  }

  cancelOrder(order: OrderListDTO): void {
    if (!this.canCancelOrder(order)) {
      this.toast.notify('Đơn hàng đã được xử lý nên không thể hủy.');
      return;
    }

    const currentRep = this.userInfo?.reputation ?? 0;
    const orderTotalPrice = Number(order.finalPrice || 0);
    const deduction = this.calculateExpectedDeduction(orderTotalPrice);
    this.actionDialog.prompt({
      title: 'Hủy đơn hàng',
      message: `Bạn đang yêu cầu hủy đơn hàng #${order.id}. Thao tác này có thể ảnh hưởng đến điểm uy tín.`,
      confirmText: 'Xác nhận hủy đơn',
      tone: 'danger',
      icon: 'bi-x-octagon-fill',
      details: [
        { label: 'Giá trị đơn', value: `${orderTotalPrice.toLocaleString('vi-VN')} đ` },
        { label: 'Điểm uy tín hiện tại', value: `${currentRep} điểm` },
        { label: 'Điểm dự kiến bị trừ', value: `-${deduction} điểm` },
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
      this.orderService.cancelOrder(order.id, reason).subscribe({
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
}
