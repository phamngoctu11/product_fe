import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { getApiErrorMessage } from '../../../model/api-response.model';
import { Order, PaymentAttempt, PaymentAttemptStatus } from '../../../model/order.model';
import { OrderService } from '../../../service/order.service';
import { ToastService } from '../../../service/toast.service';

@Component({
  selector: 'app-order-payment-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-payment-modal.component.html',
  styleUrl: './order-payment-modal.component.css',
})
export class OrderPaymentModalComponent implements OnChanges, OnDestroy {
  @Input() order: Order | null = null;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() paymentSuccess = new EventEmitter<PaymentAttempt>();
  @Output() orderRefreshRequired = new EventEmitter<void>();

  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);

  attempt: PaymentAttempt | null = null;
  isLoading = false;
  isOpening = false;
  errorMessage = '';

  // QR image states
  isQrLoading = true;
  qrLoadError = false;

  // Countdown timer
  countdownDisplay = '';
  isExpired = false;
  private countdownIntervalId: any = null;

  // Polling
  private pollingIntervalId: any = null;
  private isPollingInFlight = false;

  // Idempotency
  private currentOpenKey: string | null = null;

  // Copy feedback
  copiedField: string | null = null;
  private copyTimeoutId: any = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] || changes['order']) {
      if (this.isOpen && this.order?.id) {
        this.initPaymentFlow();
      } else if (!this.isOpen) {
        this.stopAllTimers();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopAllTimers();
  }

  private stopAllTimers(): void {
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
    if (this.copyTimeoutId) {
      clearTimeout(this.copyTimeoutId);
      this.copyTimeoutId = null;
    }
    this.isPollingInFlight = false;
  }

  initPaymentFlow(): void {
    if (!this.order?.id) return;

    if (this.order.paymentMethod === 'COD') {
      this.errorMessage = 'Đơn hàng được chọn theo phương thức Thanh toán khi nhận hàng (COD). Không cần thanh toán trực tuyến.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.isQrLoading = true;
    this.qrLoadError = false;

    // First, check if payment attempt already exists
    this.orderService.getPaymentStatus(this.order.id).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.handleAttemptData(res);
      },
      error: (err) => {
        this.isLoading = false;
        // PAYMENT_ATTEMPT_NOT_FOUND or 404 means no attempt opened yet
        if (err?.status === 404 || err?.error?.errorCode === 'PAYMENT_ATTEMPT_NOT_FOUND') {
          this.attempt = null;
        } else {
          this.errorMessage = this.mapErrorMessage(err, 'Không thể kiểm tra trạng thái thanh toán.');
        }
      },
    });
  }

  openPayment(): void {
    if (!this.order?.id || this.isOpening) return;

    this.isOpening = true;
    this.errorMessage = '';

    if (!this.currentOpenKey) {
      this.currentOpenKey = this.orderService.generateIdempotencyKey('user-payment-open', this.order.id);
    }

    this.orderService.openPaymentAttempt(this.order.id, this.currentOpenKey).subscribe({
      next: (res) => {
        this.isOpening = false;
        this.currentOpenKey = null; // Successfully completed logical action
        this.handleAttemptData(res);
      },
      error: (err) => {
        this.isOpening = false;
        if (err?.status === 409 || err?.error?.errorCode === 'ORDER_VERSION_CONFLICT') {
          this.toast.notify('Dữ liệu đơn hàng hoặc phiên thanh toán đã được cập nhật, đang làm mới...');
          this.currentOpenKey = null;
          this.orderRefreshRequired.emit();
          this.initPaymentFlow();
        } else {
          this.errorMessage = this.mapErrorMessage(err, 'Không thể tạo cổng thanh toán.');
        }
      },
    });
  }

  private handleAttemptData(res: PaymentAttempt): void {
    this.attempt = res;
    this.isQrLoading = true;
    this.qrLoadError = false;

    if (res.status === 'PENDING') {
      this.startCountdown(res.dueAt);
      this.startPolling();
    } else {
      this.stopAllTimers();
      if (res.status === 'PAID') {
        this.paymentSuccess.emit(res);
        this.orderRefreshRequired.emit();
      } else if (res.status === 'EXPIRED' || res.status === 'FAILED') {
        this.isExpired = true;
        this.orderRefreshRequired.emit();
      }
    }
  }

  private startCountdown(dueAtStr: string): void {
    if (this.countdownIntervalId) clearInterval(this.countdownIntervalId);

    const updateTime = () => {
      const dueTime = new Date(dueAtStr).getTime();
      const now = Date.now();
      const diffSec = Math.floor((dueTime - now) / 1000);

      if (diffSec <= 0) {
        this.countdownDisplay = '00:00 (Hết hạn)';
        this.isExpired = true;
        this.stopAllTimers();
        this.orderRefreshRequired.emit();
        return;
      }

      this.isExpired = false;
      const minutes = Math.floor(diffSec / 60);
      const seconds = diffSec % 60;
      this.countdownDisplay = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    };

    updateTime();
    this.countdownIntervalId = setInterval(updateTime, 1000);
  }

  private startPolling(): void {
    if (this.pollingIntervalId) clearInterval(this.pollingIntervalId);

    // Poll every 3.5 seconds
    this.pollingIntervalId = setInterval(() => {
      if (this.isPollingInFlight || !this.order?.id || !this.attempt || this.attempt.status !== 'PENDING') {
        return;
      }

      this.isPollingInFlight = true;
      this.orderService.getPaymentStatus(this.order.id).subscribe({
        next: (statusRes) => {
          this.isPollingInFlight = false;
          if (statusRes.status !== 'PENDING') {
            this.handleAttemptData(statusRes);
          }
        },
        error: () => {
          this.isPollingInFlight = false;
        },
      });
    }, 3500);
  }

  copyText(text: string | number | null | undefined, fieldName: string): void {
    if (!text) return;
    const val = String(text);
    navigator.clipboard.writeText(val).then(() => {
      this.copiedField = fieldName;
      if (this.copyTimeoutId) clearTimeout(this.copyTimeoutId);
      this.copyTimeoutId = setTimeout(() => {
        this.copiedField = null;
      }, 2000);
    });
  }

  onQrLoaded(): void {
    this.isQrLoading = false;
    this.qrLoadError = false;
  }

  onQrError(): void {
    this.isQrLoading = false;
    this.qrLoadError = true;
  }

  retryQrLoad(): void {
    this.isQrLoading = true;
    this.qrLoadError = false;
  }

  onClose(): void {
    this.stopAllTimers();
    this.close.emit();
  }

  private mapErrorMessage(err: any, fallback: string): string {
    const code = err?.error?.errorCode || err?.error?.message;
    switch (code) {
      case 'PAYMENT_NOT_AVAILABLE':
        return 'Cổng thanh toán hiện không khả dụng. Vui lòng thử lại sau.';
      case 'PAYMENT_METHOD_NOT_ONLINE':
        return 'Đơn hàng không thuộc phương thức thanh toán trực tuyến.';
      case 'PAYMENT_ATTEMPT_NOT_FOUND':
        return 'Chưa tìm thấy phiên thanh toán cho đơn hàng.';
      case 'PAYMENT_ATTEMPT_EXPIRED':
        return 'Phiên thanh toán đã hết hạn.';
      case 'ORDER_NOT_READY_FOR_PRODUCTION':
        return 'Đơn hàng chưa sẵn sàng để sản xuất.';
      case 'ORDER_VERSION_CONFLICT':
        return 'Phiên làm việc đã thay đổi, vui lòng làm mới trang.';
      case 'REQUEST_KEY_CONFLICT':
        return 'Yêu cầu đang được xử lý, vui lòng chờ trong giây lát.';
      default:
        return getApiErrorMessage(err, fallback);
    }
  }
}

