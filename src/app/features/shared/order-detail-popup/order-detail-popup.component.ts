import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs/operators';
import {
  ApiResponse,
  getApiErrorMessage,
  unwrapApiResponse,
} from '../../../model/api-response.model';
import { Order, OrderItem, ReceiptConfirmResponse } from '../../../model/order.model';
import { ProductReview } from '../../../model/product-review.model';
import { AuthService } from '../../../service/auth.service';
import { ProductReviewService } from '../../../service/product-review.service';
import { ToastService } from '../../../service/toast.service';
import { environment } from '../../../../environments/environment';
import { RouterModule } from '@angular/router';
import {
  OrderItemsTableComponent,
  OrderStatusBadgeComponent,
  ViewStateComponent,
} from '../../shared/ui';
import type { OrderItemQuantityChange } from '../../shared/ui';
import { OrderPaymentModalComponent } from '../order-payment/order-payment-modal.component';
import { CustomerProductionProgressComponent } from '../production-checkpoint/customer-production-progress.component';
import { ChangeRequestPanelComponent } from '../change-request/change-request-panel.component';

@Component({
  selector: 'app-order-detail-popup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    OrderItemsTableComponent,
    OrderStatusBadgeComponent,
    ViewStateComponent,
    OrderPaymentModalComponent,
    CustomerProductionProgressComponent,
    ChangeRequestPanelComponent,
  ],
  templateUrl: './order-detail-popup.component.html',
  styleUrl: './order-detail-popup.component.css',
})
export class OrderDetailPopupComponent {
  @Input() order: Order | null = null;
  @Input() isLoading = false;
  @Input() error = '';
  @Input() receiptMode = false;
  @Input() presentation: 'modal' | 'embedded' = 'modal';
  @Input() guestToken: string | null = null;
  @Input() receivedQuantities: { [key: number]: number } = {};
  @Input() receiptResponse: ReceiptConfirmResponse | null = null;
  @Input() receiptError = '';
  @Input() isSubmittingReceipt = false;
  @Input() canConfirmReceipt = true;
  @Input() dataWarning: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() submitReceipt = new EventEmitter<boolean>();
  @Output() orderUpdated = new EventEmitter<void>();

  readonly reviewStars = [1, 2, 3, 4, 5];
  reviewingItem: OrderItem | null = null;
  reviewRating: number | null = null;
  hoveredRating = 0;
  reviewComment = '';
  reviewImageUrls: string[] = [];
  reviewError = '';
  isUploadingReviewImage = false;
  isSubmittingReview = false;
  paymentModalOpen = false;

  constructor(
    private readonly productReviewService: ProductReviewService,
    private readonly http: HttpClient,
    private readonly toast: ToastService,
    public readonly authService: AuthService,
  ) {}

  get isVisible(): boolean {
    return this.isLoading || !!this.order || !!this.error;
  }

  canShowProductionProgress(order: Order | null): boolean {
    if (!order || !order.id || this.receiptMode) return false;
    const s = (order.status || '').toUpperCase();
    return (
      s === 'ORDER_CREATING' ||
      s === 'READY_TO_SHIP' ||
      s === 'SHIPPING' ||
      s === 'DELIVERED'
    );
  }

  private isGuestOrder(order: Order | null): boolean {
    if (!order) return true;
    if (order.orderType === 'CUSTOM') return false;
    if (order.customer?.guest) return true;
    if (order.guestSessionId) return true;
    const userId = order.userId ?? order.user_id ?? order.customer?.userId;
    return !userId;
  }

  canShowCollaboration(order: Order): boolean {
    if (this.receiptMode) return false;
    if (!order || !order.id) return false;
    if (this.isGuestOrder(order)) return false;
    return (
      order.status === 'DISCUSSING' ||
      order.status === 'WAITING_STAFF_CONFIRMATION' ||
      order.status === 'ORDER_ACCEPTED'
    );
  }

  canShowChangeRequests(order: Order): boolean {
    if (this.receiptMode || this.guestToken || this.isGuestOrder(order)) return false;
    return this.authService.isCustomer()
      && ['ORDER_ACCEPTED', 'ORDER_CREATING'].includes((order.status || '').toUpperCase());
  }

  canPayOrder(order: Order | null): boolean {
    if (!order || this.receiptMode) return false;
    if (this.isGuestOrder(order)) return false;
    return (
      order.status === 'ORDER_ACCEPTED' &&
      order.paymentMethod === 'ONLINE' &&
      order.paymentStatus !== 'PAID' &&
      order.paymentStatus !== 'EXPIRED' &&
      order.paymentStatus !== 'FAILED'
    );
  }

  openPaymentModal(): void {
    this.paymentModalOpen = true;
  }

  closePaymentModal(): void {
    this.paymentModalOpen = false;
  }

  updateReceivedQuantity(change: OrderItemQuantityChange): void {
    if (change.orderItemId) {
      this.receivedQuantities[change.orderItemId] = change.quantity;
    }
    if (change.variantId) {
      this.receivedQuantities[change.variantId] = change.quantity;
    }
  }

  getOrderItems(order: Order): OrderItem[] {
    return order.items || order.orderItems || order.details || [];
  }

  getOriginalTotal(order: Order): number {
    const items = this.getOrderItems(order);
    const itemTotal = items.reduce((total, item) => {
      const price = Number(item.price || 0);
      const quantity = Number(item.quantity || 0);
      return total + price * quantity;
    }, 0);

    if (itemTotal > 0) {
      return itemTotal;
    }
    return Number(order.totalPrice || 0);
  }

  getFinalTotal(order: Order): number | null {
    if (order.finalPrice !== null && order.finalPrice !== undefined) {
      return Number(order.finalPrice || 0);
    }
    if (order.orderType === 'CUSTOM') return null;
    return Math.max(0, this.getOriginalTotal(order) - Number(order.discountAmount || 0));
  }

  canShowReviewSection(order: Order): boolean {
    return !this.receiptMode
      && this.authService.isCustomer()
      && this.isDelivered(order)
      && this.getOrderItems(order).length > 0;
  }

  canReviewItem(item: OrderItem): boolean {
    return !item.reviewed && this.getReceivedQuantity(item) > 0 && this.getOrderItemId(item) > 0;
  }

  openReview(item: OrderItem): void {
    if (!this.canReviewItem(item)) {
      return;
    }
    this.reviewingItem = item;
    this.reviewRating = null;
    this.hoveredRating = 0;
    this.reviewComment = '';
    this.reviewImageUrls = [];
    this.reviewError = '';
  }

  closeReviewForm(): void {
    if (this.isSubmittingReview || this.isUploadingReviewImage) {
      return;
    }
    this.reviewingItem = null;
    this.reviewRating = null;
    this.hoveredRating = 0;
    this.reviewComment = '';
    this.reviewImageUrls = [];
    this.reviewError = '';
  }

  setRating(star: number): void {
    this.reviewRating = this.reviewRating === star ? null : star;
    this.reviewError = '';
  }

  updateReviewComment(event: Event): void {
    this.reviewComment = (event.target as HTMLTextAreaElement).value;
    this.reviewError = '';
  }

  getDisplayRating(): number {
    return this.hoveredRating || this.reviewRating || 0;
  }

  onReviewImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (this.reviewImageUrls.length >= 5) {
      this.toast.warning('Mỗi đánh giá chỉ tối đa 5 ảnh.');
      input.value = '';
      return;
    }

    this.isUploadingReviewImage = true;
    const formData = new FormData();
    formData.append('file', file);

    this.http
      .post<ApiResponse<{ url: string }> | { url: string }>(
        `${environment.apiUrl}/upload/image`,
        formData,
      )
      .pipe(map(unwrapApiResponse))
      .subscribe({
        next: (response) => {
          if (response?.url && !this.reviewImageUrls.includes(response.url)) {
            this.reviewImageUrls = [...this.reviewImageUrls, response.url].slice(0, 5);
          }
          this.reviewError = '';
          this.isUploadingReviewImage = false;
          input.value = '';
        },
        error: (error) => {
          this.reviewError = getApiErrorMessage(error, 'Không thể tải ảnh đánh giá.');
          this.toast.fromError(error, 'Không thể tải ảnh đánh giá.');
          this.isUploadingReviewImage = false;
          input.value = '';
        },
      });
  }

  removeReviewImage(index: number): void {
    this.reviewImageUrls = this.reviewImageUrls.filter((_, imageIndex) => imageIndex !== index);
  }

  submitReview(): void {
    if (!this.reviewingItem) {
      return;
    }

    const orderItemId = this.getOrderItemId(this.reviewingItem);
    if (!orderItemId) {
      this.reviewError = 'Không tìm thấy item cần đánh giá.';
      return;
    }

    const payload = {
      rating: this.reviewRating,
      comment: this.reviewComment.trim() || null,
      imageUrls: this.reviewImageUrls,
    };

    if (!payload.rating && !payload.comment && payload.imageUrls.length === 0) {
      this.reviewError = 'Vui lòng chọn sao, nhập bình luận hoặc thêm ảnh.';
      return;
    }

    this.isSubmittingReview = true;
    this.reviewError = '';
    this.productReviewService.createForOrderItem(orderItemId, payload).subscribe({
      next: (review) => {
        this.markReviewed(this.reviewingItem, review);
        this.toast.success('Đánh giá sản phẩm thành công.');
        this.isSubmittingReview = false;
        this.closeReviewForm();
      },
      error: (error) => {
        this.reviewError = getApiErrorMessage(error, 'Không thể gửi đánh giá lúc này.');
        this.toast.fromError(error, 'Không thể gửi đánh giá lúc này.');
        this.isSubmittingReview = false;
      },
    });
  }

  getItemImage(item: OrderItem): string {
    return item.imageUrl || item.image_url || '';
  }

  getItemName(item: OrderItem): string {
    return item.variantName || item.productName || 'Sản phẩm';
  }

  getItemVariantLabel(item: OrderItem): string {
    return item.attributes || (item.variantId ? `Variant #${item.variantId}` : 'Chưa có thuộc tính');
  }

  getReceivedQuantity(item: OrderItem): number {
    return Number(item.receivedQuantity ?? item.exportedQuantity ?? item.quantity ?? 0);
  }

  getOrderItemId(item: OrderItem): number {
    return Number(item.orderItemId || item.id || 0);
  }

  private isDelivered(order: Order): boolean {
    return (order.status || '').toUpperCase() === 'DELIVERED';
  }

  private markReviewed(item: OrderItem | null, review: ProductReview): void {
    if (!item) {
      return;
    }
    item.reviewed = true;
    item.reviewId = review.id;
  }
}
