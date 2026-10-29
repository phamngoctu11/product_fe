import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../../service/order.service';
import { ToastService } from '../../../service/toast.service';
import { inject as injectToast } from '@angular/core';
import {
  ItemCheckRequest,
  Order,
  OrderItem,
  OrderStatusHistory,
  ReceiptConfirmRequest,
  ReceiptConfirmResponse,
  ReceiptViewDTO,
} from '../../../model/order.model';
import { getApiErrorMessage } from '../../../model/api-response.model';
import { OrderDetailPopupComponent } from '../../shared/order-detail-popup/order-detail-popup.component';
import { OrderTimelineModalComponent } from '../../shared/order-timeline/order-timeline-modal.component';
import { ViewStateComponent } from '../../shared/ui';
import { SfPageIntroComponent } from '../ui/page-intro/sf-page-intro.component';

@Component({
  selector: 'app-guest-order',
  standalone: true,
  imports: [
    CommonModule,
    OrderDetailPopupComponent,
    OrderTimelineModalComponent,
    SfPageIntroComponent,
    ViewStateComponent,
  ],
  template: `
    <div class="sf-container guest-order-page">
      <sf-page-intro
        title="Tra cứu đơn hàng của bạn"
        subtitle="Xem trạng thái, chi tiết và xác nhận nhận hàng."
      ></sf-page-intro>

      <app-view-state
        [loading]="isLoading"
        [error]="error"
        [empty]="!order"
        actionLabel="Thử tải lại"
        (action)="loadOrder()"
      >
        <div *ngIf="order" class="guest-order-card">
          <div class="guest-order-header">
            <div>
              <h3 class="text-xl font-medium text-gray-900">Đơn hàng #{{ order.id }}</h3>
              <p class="text-gray-500 mt-1">Trạng thái hiện tại: <span class="font-medium text-primary-600">{{ getStatusLabel(order.status) }}</span></p>
            </div>
            <div class="flex gap-3">
              <button 
                *ngIf="order.status === 'READY_TO_SHIP' || order.status === 'SHIPPING' || order.status === 'DELIVERED'"
                class="sf-button-outline text-sm py-2 px-4" 
                (click)="viewTimeline()"
              >
                <i class="bi bi-clock-history mr-2"></i> Lịch sử
              </button>
            </div>
          </div>

          <div class="guest-order-content">
            <app-order-detail-popup
              [order]="order"
              [isLoading]="isLoadingReceipt"
              [error]="error"
              [receiptMode]="receiptMode"
              presentation="embedded"
              [guestToken]="token"
              [receivedQuantities]="receivedQuantities"
              [receiptResponse]="receiptResponse"
              [receiptError]="receiptError"
              [isSubmittingReceipt]="isSubmittingReceipt"
              [canConfirmReceipt]="receiptView?.canConfirmReceipt ?? false"
              [dataWarning]="receiptView?.dataWarning || null"
              (guestReceiptRequested)="openReceiptConfirm()"
              (submitReceipt)="submitReceiptConfirm($event)"
              (close)="cancelReceiptConfirm()"
              (orderUpdated)="loadOrder()"
            ></app-order-detail-popup>
          </div>
        </div>
      </app-view-state>

      <app-order-timeline-modal [open]="isTimelineModalOpen" [orderId]="orderId" [history]="history" [loading]="isLoadingTimeline" (closed)="closeTimeline()"></app-order-timeline-modal>
    </div>
  `,
  styleUrl: './guest-order.component.css',
})
export class GuestOrderComponent implements OnInit {
  private readonly toast = injectToast(ToastService);
  
  orderId: number | null = null;
  token: string | null = null;
  
  order: Order | null = null;
  isLoading = true;
  error = '';
  
  history: OrderStatusHistory[] = [];
  isLoadingTimeline = false;
  isTimelineModalOpen = false;

  receiptMode = false;
  isLoadingReceipt = false;
  isSubmittingReceipt = false;
  receiptError = '';
  receiptView: ReceiptViewDTO | null = null;
  receivedQuantities: { [orderItemId: number]: number } = {};
  receiptResponse: ReceiptConfirmResponse | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.orderId = Number(idParam);
      }
      this.token = this.route.snapshot.queryParamMap.get('token');
      this.loadOrder();
    });
  }

  loadOrder(): void {
    if (!this.orderId || !this.token) {
      this.error = 'Đường dẫn không hợp lệ. Thiếu mã đơn hàng hoặc token.';
      this.isLoading = false;
      return;
    }
    
    this.isLoading = true;
    this.error = '';
    
    this.orderService.getGuestOrder(this.orderId, this.token).subscribe({
      next: (order: any) => {
        this.order = order;
        this.isLoading = false;
        
        if (this.receiptMode) {
          this.openReceiptConfirm();
        }
      },
      error: (err: any) => {
        this.error = getApiErrorMessage(err, 'Không thể tải thông tin đơn hàng.');
        this.isLoading = false;
      }
    });
  }

  viewTimeline(): void {
    if (!this.orderId || !this.token || !this.order) return;
    
    this.isTimelineModalOpen = true;
    this.isLoadingTimeline = true;
    this.history = [];
    
    this.orderService.getGuestOrderHistory(this.orderId, this.token).subscribe({
      next: (data: any) => {
        const initialStep: OrderStatusHistory = {
          id: 0,
          oldstatus: '',
          newstatus: 'PENDING_APPROVAL',
          updatetime: this.order?.startOrderTime || new Date().toISOString(),
          changerId: 1,
        };
        this.history = [initialStep, ...data];
        this.isLoadingTimeline = false;
      },
      error: (err: any) => {
        this.toast.notify('Không thể tải lịch sử đơn hàng: ' + getApiErrorMessage(err, 'Không thể tải lịch sử đơn hàng.'));
        this.isLoadingTimeline = false;
      }
    });
  }

  closeTimeline(): void {
    this.isTimelineModalOpen = false;
  }

  openReceiptConfirm(): void {
    if (!this.orderId || !this.token) return;
    if ((this.order?.status || '').trim().toUpperCase() !== 'SHIPPING') return;
    this.receiptMode = true;
    this.receiptError = '';
    this.receiptResponse = null;
    this.receivedQuantities = {};
    this.receiptView = null;
    this.isLoadingReceipt = true;

    this.orderService.getGuestReceiptView(this.orderId, this.token).subscribe({
      next: (rv) => {
        this.receiptView = rv;
        this.isLoadingReceipt = false;
        (rv.items || []).forEach((item) => {
          this.receivedQuantities[item.orderItemId] = item.exportedQuantity ?? item.orderedQuantity ?? 0;
        });
      },
      error: (err) => {
        this.receiptError = getApiErrorMessage(err, 'Không thể tải thông tin xác nhận nhận hàng.');
        this.isLoadingReceipt = false;
      },
    });
  }
  
  cancelReceiptConfirm(): void {
    this.receiptMode = false;
    this.isLoadingReceipt = false;
    this.receiptView = null;
    this.receiptResponse = null;
    this.receiptError = '';
    this.receivedQuantities = {};
  }

  submitReceiptConfirm(acceptMismatch: boolean = false): void {
    if (!this.orderId || !this.token || !this.receiptView) return;

    if (!this.receiptView.canConfirmReceipt) {
      this.receiptError = 'Đơn hàng chưa ở trạng thái sẵn sàng để xác nhận nhận hàng.';
      return;
    }

    const items = this.receiptView.items || [];
    const receivedItems: ItemCheckRequest[] = items.map((item) => ({
      orderItemId: item.orderItemId,
      receivedQuantity: Number(this.receivedQuantities[item.orderItemId] ?? item.exportedQuantity ?? item.orderedQuantity ?? 0),
    }));

    if (receivedItems.length === 0) {
      this.receiptError = 'Không có sản phẩm hợp lệ để xác nhận nhận hàng.';
      return;
    }

    const intentKey = this.orderService.generateIdempotencyKey(
      acceptMismatch ? 'guest-receipt-mismatch' : 'guest-receipt',
      this.orderId
    );

    this.isSubmittingReceipt = true;
    this.receiptError = '';

    const payload: ReceiptConfirmRequest = {
      orderVersion: this.receiptView.orderVersion,
      receivedItems,
      acceptMismatch,
      note: null,
    };

    this.orderService.confirmGuestReceipt(this.orderId, this.token, payload, intentKey).subscribe({
      next: (response) => {
        this.receiptResponse = response;
        this.isSubmittingReceipt = false;

        if (response.completed) {
          this.toast.notify(response.message || 'Xác nhận nhận hàng thành công!');
          this.cancelReceiptConfirm();
          this.loadOrder();
          return;
        }

        this.receiptError = response.message || 'Số lượng thực nhận đang lệch so với số lượng xuất kho.';
      },
      error: (err) => {
        this.isSubmittingReceipt = false;
        if (err?.status === 409 || err?.error?.errorCode === 'ORDER_VERSION_CONFLICT') {
          this.toast.notify('Dữ liệu đơn hàng đã thay đổi trên máy chủ, đang làm mới...');
          this.openReceiptConfirm();
        } else {
          this.receiptError = getApiErrorMessage(err, 'Không thể xác nhận nhận hàng.');
        }
      },
    });
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return 'Không xác định';
    const statusMap: { [key: string]: string } = {
      'PENDING_APPROVAL': 'Chờ duyệt',
      'PENDING_ASSIGNMENT': 'Chờ phân công',
      'DISCUSSING': 'Đang trao đổi',
      'WAITING_STAFF_CONFIRMATION': 'Chờ staff xác nhận',
      'ORDER_ACCEPTED': 'Đã chốt đơn',
      'ORDER_CREATING': 'Đang chế tác',
      'READY_TO_SHIP': 'Chờ KCS & Xuất kho',
      'SHIPPING': 'Đang giao hàng',
      'DELIVERED': 'Đã giao thành công',
      'CANCELLED': 'Đã hủy',
    };
    return statusMap[status] || status;
  }
}
