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
  ReceiptConfirmResponse,
} from '../../../model/order.model';
import { getApiErrorMessage } from '../../../model/api-response.model';
import { OrderDetailPopupComponent } from '../../shared/order-detail-popup/order-detail-popup.component';
import { ViewStateComponent } from '../../shared/ui';
import { SfPageIntroComponent } from '../ui/page-intro/sf-page-intro.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-guest-order',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    OrderDetailPopupComponent,
    SfPageIntroComponent,
    ViewStateComponent,
  ],
  template: `
    <div class="sf-container py-12 min-h-screen">
      <sf-page-intro
        title="Tra cứu đơn hàng của bạn"
        description="Xem trạng thái, chi tiết và xác nhận nhận hàng."
      ></sf-page-intro>

      <app-view-state
        [loading]="isLoading"
        [error]="error"
        [empty]="!order"
        (retry)="loadOrder()"
      >
        <div *ngIf="order" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-8">
          <div class="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
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
              <button 
                *ngIf="order.status === 'SHIPPING'"
                class="sf-button-primary text-sm py-2 px-4" 
                (click)="openReceiptConfirm()"
              >
                <i class="bi bi-check2-circle mr-2"></i> Xác nhận nhận hàng
              </button>
            </div>
          </div>

          <div class="p-0 md:p-6 bg-gray-50/50">
            <!-- Reuse OrderDetailPopup UI logically but embedded directly for Guest -->
            <app-order-detail-popup
              *ngIf="!receiptMode"
              [order]="order"
              [isLoading]="isLoading"
              [error]="error"
            ></app-order-detail-popup>

            <!-- Receipt Confirm UI -->
            <div *ngIf="receiptMode" class="bg-white p-6 rounded-lg shadow-sm">
              <h4 class="font-medium text-lg mb-4 text-gray-900 border-b pb-3">Xác nhận số lượng thực nhận</h4>
              <div *ngIf="receiptError" class="bg-red-50 text-red-600 p-4 rounded-lg mb-4 text-sm flex gap-2">
                <i class="bi bi-exclamation-circle-fill mt-0.5"></i>
                <div class="flex-1">{{ receiptError }}</div>
              </div>
              <div class="space-y-4">
                <div *ngFor="let item of order.items" class="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-lg">
                  <img [src]="item.imageUrl || '/images/placeholder.jpg'" class="w-16 h-16 object-cover rounded-md" alt="Ảnh sản phẩm">
                  <div class="flex-1">
                    <p class="font-medium text-gray-800">{{ getVariantName(item) }}</p>
                    <p class="text-sm text-gray-500 mt-1">
                      Số lượng đã xuất: <span class="font-bold">{{ item.exportedQuantity ?? item.quantity }}</span>
                    </p>
                  </div>
                  <div class="w-full sm:w-32">
                    <label class="block text-xs text-gray-500 mb-1">Thực nhận</label>
                    <input 
                      type="number" 
                      class="sf-input w-full"
                      [(ngModel)]="receivedQuantities[getReceiptVariantId(item)]"
                      min="0"
                    >
                  </div>
                </div>
              </div>

              <!-- Action buttons for receipt -->
              <div class="mt-6 flex flex-wrap justify-end gap-3 pt-4 border-t">
                <button 
                  class="sf-button-outline" 
                  (click)="cancelReceiptConfirm()" 
                  [disabled]="isSubmittingReceipt"
                >
                  Quay lại
                </button>
                <button 
                  *ngIf="receiptResponse && !receiptResponse.confirmed"
                  class="sf-button-primary bg-yellow-600 border-yellow-600 hover:bg-yellow-700" 
                  (click)="submitReceiptConfirm(true)" 
                  [disabled]="isSubmittingReceipt"
                >
                  <i class="bi bi-exclamation-triangle mr-2"></i> Chấp nhận lệch số lượng
                </button>
                <button 
                  class="sf-button-primary" 
                  (click)="submitReceiptConfirm()" 
                  [disabled]="isSubmittingReceipt"
                >
                  <span *ngIf="isSubmittingReceipt" class="spinner-border spinner-border-sm mr-2" role="status"></span>
                  <i *ngIf="!isSubmittingReceipt" class="bi bi-check-circle mr-2"></i>
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      </app-view-state>

      <!-- Timeline Modal -->
      <div 
        class="modal fade" 
        id="guestTimelineModal" 
        tabindex="-1" 
        aria-hidden="true"
        [class.show]="isTimelineModalOpen"
        [style.display]="isTimelineModalOpen ? 'block' : 'none'"
        [class.modal-backdrop-show]="isTimelineModalOpen"
      >
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content border-0 rounded-2xl shadow-xl">
            <div class="modal-header border-b border-gray-100 p-5 bg-gray-50/50 rounded-t-2xl">
              <h5 class="modal-title font-medium text-gray-800">Lịch sử đơn hàng</h5>
              <button type="button" class="btn-close" (click)="closeTimeline()"></button>
            </div>
            <div class="modal-body p-6">
              <div *ngIf="isLoadingTimeline" class="text-center py-8">
                <div class="spinner-border text-primary-600" role="status"></div>
                <p class="text-gray-500 mt-3">Đang tải lịch sử...</p>
              </div>
              <div *ngIf="!isLoadingTimeline && history.length === 0" class="text-center py-8 text-gray-500">
                Chưa có lịch sử trạng thái cho đơn hàng này.
              </div>
              <div *ngIf="!isLoadingTimeline && history.length > 0" class="timeline relative pl-4">
                <div class="absolute top-0 bottom-0 left-[11px] w-px bg-gray-200"></div>
                <div *ngFor="let step of history; let last = last" class="relative mb-6 last:mb-0">
                  <div class="absolute -left-[22px] top-1 w-[14px] h-[14px] rounded-full"
                    [ngClass]="last ? 'bg-primary-500 ring-4 ring-primary-50' : 'bg-gray-300'"
                  ></div>
                  <div>
                    <h6 class="font-medium" [ngClass]="last ? 'text-primary-800' : 'text-gray-700'">
                      {{ getStatusLabel(step.newstatus) }}
                    </h6>
                    <p class="text-sm text-gray-500 mt-1">{{ step.updatetime | date:'dd/MM/yyyy HH:mm' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div *ngIf="isTimelineModalOpen" class="modal-backdrop fade show"></div>
    </div>
  `,
  styles: [`
    .modal-backdrop-show { background: rgba(0,0,0,0.5); }
  `]
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
  isSubmittingReceipt = false;
  receiptError = '';
  receivedQuantities: { [variantId: number]: number } = {};
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
          this.initReceivedQuantities();
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
    this.receiptMode = true;
    this.receiptError = '';
    this.receiptResponse = null;
    this.initReceivedQuantities();
  }
  
  cancelReceiptConfirm(): void {
    this.receiptMode = false;
  }

  initReceivedQuantities(): void {
    this.receivedQuantities = {};
    if (this.order && this.order.items) {
      this.order.items.forEach(item => {
        const variantId = this.getReceiptVariantId(item);
        if (variantId) {
          this.receivedQuantities[variantId] = Number(item.exportedQuantity ?? item.quantity ?? 0);
        }
      });
    }
  }

  submitReceiptConfirm(acceptMismatch: boolean = false): void {
    if (!this.order || !this.token) return;

    const receivedItems = this.buildReceivedItemsPayload();
    if (receivedItems.length === 0) {
      this.receiptError = 'Không có item hợp lệ để xác nhận nhận hàng.';
      return;
    }

    this.isSubmittingReceipt = true;
    this.receiptError = '';
    
    this.orderService.confirmGuestReceipt(this.order.id, this.token, { receivedItems, acceptMismatch }).subscribe({
      next: (response: any) => {
        this.receiptResponse = response;
        this.isSubmittingReceipt = false;

        if (response.confirmed) {
          this.toast.notify(response.message || 'Xác nhận nhận hàng thành công!');
          this.receiptMode = false;
          this.loadOrder();
          return;
        }

        this.receiptError = response.message || 'Số lượng thực nhận đang lệch so với số lượng xuất kho.';
      },
      error: (err: any) => {
        this.receiptError = getApiErrorMessage(err, 'Không thể xác nhận nhận hàng.');
        this.isSubmittingReceipt = false;
      },
    });
  }

  getReceiptVariantId(item: OrderItem): number {
    return Number(item.variantId || item.productVariantId || 0);
  }
  
  getVariantName(item: OrderItem): string {
    return item.variantName || ('Sản phẩm #' + this.getReceiptVariantId(item));
  }

  private buildReceivedItemsPayload(): ItemCheckRequest[] {
    if (!this.order?.items?.length) return [];

    return this.order.items.map((item) => {
      const variantId = this.getReceiptVariantId(item);
      return {
        variantId,
        quantity: Number(this.receivedQuantities[variantId] ?? 0),
      };
    }).filter((item) => item.variantId > 0 && item.quantity >= 0);
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return 'Không xác định';
    const statusMap: { [key: string]: string } = {
      'PENDING_PAYMENT': 'Chờ thanh toán',
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
