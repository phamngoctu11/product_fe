import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  getApiErrorMessage,
  unwrapApiResponse,
} from '../../../model/api-response.model';
import {
  Order,
  OrderAgreement,
  OrderAgreementDecision,
  OrderAgreementDecisionRequest,
  OrderChatMessage,
  OrderChatThread,
  SubmitOrderAgreementRequest,
} from '../../../model/order.model';
import { getOrderStatusLabel } from '../ui/order-status-badge/order-status.config';
import { AuthService } from '../../../service/auth.service';
import { OrderService } from '../../../service/order.service';
import { ToastService } from '../../../service/toast.service';
import { WebsocketService } from '../../../service/websocket.service';

@Component({
  selector: 'app-order-collaboration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-collaboration.component.html',
  styleUrl: './order-collaboration.component.css',
})
export class OrderCollaborationComponent implements OnInit, OnChanges, OnDestroy {
  @Input() order: Order | null = null;
  @Input() mode: 'USER' | 'STAFF' = 'USER';
  @Input() initialTab: 'agreement' | 'chat' = 'agreement';
  @Input() onlyChat: boolean = false;
  @Output() orderUpdated = new EventEmitter<void>();

  @ViewChild('chatScrollContainer') private chatScrollContainer?: ElementRef<HTMLDivElement>;

  private readonly orderService = inject(OrderService);
  private readonly websocketService = inject(WebsocketService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly http = inject(HttpClient);

  // Tabs for mobile / responsive
  activeTab: 'agreement' | 'chat' = 'agreement';

  // WebSocket Live Connection State
  wsConnected = false;
  private wsConnectionSub: Subscription | null = null;

  get isWsConnected(): boolean {
    return this.wsConnected || this.websocketService.isOrderChatConnected();
  }

  // Agreement State
  agreement: OrderAgreement | null = null;
  isLoadingAgreement = false;
  agreementError = '';
  isSubmittingAgreement = false;
  isDecidingAgreement = false;

  // Custom agreement form model
  customDescription = '';
  customImageUrls: string[] = [];
  customProductTypeName = '';
  customFieldEntries: { label: string; value: string }[] = [];
  customQuantity = 1;
  customUnitPrice = 0;
  customDurationDays = 3;
  customPaymentMethod: 'COD' | 'ONLINE' = 'COD';
  customUserVoucherId: number | null = null;
  customNote = '';
  isUploadingImage = false;

  // Staff decision model
  staffDecision: OrderAgreementDecision = 'CONFIRM';
  staffDecisionReason = '';
  showDecisionModal = false;

  // 24h Countdown Timer State
  countdownDisplay = '';
  countdownPastDue = false;
  timerStopped = false;
  timerStoppedText = '';
  private timerIntervalId: any = null;

  // Chat State
  messages: OrderChatMessage[] = [];
  isLoadingChat = false;
  chatError = '';
  chatInput = '';
  isSendingMessage = false;
  isThreadPreparing = false;
  private messageIdSet = new Set<string>();
  private chatUnsubscribe: (() => void) | null = null;
  threadRetryCount = 0;
  private threadRetryTimeout: any = null;

  get currentUserId(): string | number | null {
    return this.authService.getUserId();
  }

  get isGuestOrder(): boolean {
    if (!this.order) return true;
    if (this.order.orderType === 'CUSTOM') return false;
    if (this.order.customer?.guest) return true;
    if (this.order.guestSessionId) return true;
    const userId = this.order.userId ?? this.order.user_id ?? this.order.customer?.userId;
    return !userId;
  }

  get isCustomOrder(): boolean {
    if (this.order?.orderType === 'CUSTOM') return true;
    if (this.order?.items && this.order.items.some((i) => i.sourceType === 'CUSTOM')) return true;
    return false;
  }

  get isTerminalOrder(): boolean {
    return ['DELIVERED', 'CANCELLED'].includes((this.order?.status || '').toUpperCase());
  }

  get isAgreementExpired(): boolean {
    return this.countdownPastDue && (this.order?.status || '').toUpperCase() === 'DISCUSSING';
  }

  get hasSubmittedAgreement(): boolean {
    const status = (this.agreement?.agreementStatus || this.agreement?.status || '').toUpperCase();
    return ['USER_SUBMITTED', 'PENDING_REVIEW', 'STAFF_CONFIRMED', 'AGREED', 'CHANGES_REQUESTED', 'AMENDMENT_REQUESTED'].includes(status)
      || (this.order?.status || '').toUpperCase() === 'WAITING_STAFF_CONFIRMATION';
  }

  get orderStatusLabel(): string {
    return getOrderStatusLabel(this.order?.status);
  }

  get canUserSubmitAgreement(): boolean {
    if (this.mode !== 'USER') return false;
    const status = this.order?.status;
    return status === 'DISCUSSING' && !this.countdownPastDue && !this.isTerminalOrder;
  }

  get canStaffDecideAgreement(): boolean {
    if (this.mode !== 'STAFF') return false;
    const status = this.order?.status;
    const agreeStatus = this.agreement?.agreementStatus || this.agreement?.status;
    return status === 'WAITING_STAFF_CONFIRMATION' || agreeStatus === 'USER_SUBMITTED' || agreeStatus === 'PENDING_REVIEW';
  }

  get agreementStatusBadge(): { text: string; bgClass: string } {
    const status = this.agreement?.agreementStatus || this.agreement?.status;
    if (!status) {
      if (this.isTerminalOrder) return { text: 'Không thể cập nhật thêm', bgClass: 'badge-secondary' };
      if ((this.order?.status || '').toUpperCase() === 'DISCUSSING') return { text: 'Chưa chốt thỏa thuận', bgClass: 'badge-info' };
      if ((this.order?.status || '').toUpperCase() === 'WAITING_STAFF_CONFIRMATION') return { text: 'Chờ nhân viên xác nhận', bgClass: 'badge-warning' };
    }
    switch (status) {
      case 'USER_SUBMITTED':
      case 'PENDING_REVIEW':
        return { text: 'Chờ nhân viên xác nhận', bgClass: 'badge-warning' };
      case 'STAFF_CONFIRMED':
      case 'AGREED':
        return { text: 'Đã chốt thỏa thuận', bgClass: 'badge-success' };
      case 'CHANGES_REQUESTED':
      case 'AMENDMENT_REQUESTED':
        return { text: 'Yêu cầu chỉnh sửa', bgClass: 'badge-warning' };
      case 'REJECTED':
        return { text: 'Bị từ chối', bgClass: 'badge-danger' };
      case 'TIMEOUT_CANCELLED':
        return { text: 'Hết hạn thỏa thuận', bgClass: 'badge-secondary' };
      default:
        return { text: 'Đang thảo luận', bgClass: 'badge-info' };
    }
  }

  get computedSubtotal(): number {
    if (this.isCustomOrder) {
      return Math.max(0, (this.customQuantity || 1) * (this.customUnitPrice || 0));
    }
    return this.agreement?.subtotal || this.order?.totalPrice || 0;
  }

  get computedFinalPrice(): number {
    const discount = this.agreement?.discountAmount || this.order?.discountAmount || 0;
    return Math.max(0, this.computedSubtotal - discount);
  }

  ngOnInit(): void {
    if (this.onlyChat) {
      this.activeTab = 'chat';
    } else if (this.initialTab) {
      this.activeTab = this.initialTab;
    }
    this.wsConnected = this.websocketService.isOrderChatConnected();
    this.wsConnectionSub = this.websocketService.isConnected$.subscribe((connected) => {
      this.wsConnected = connected;
    });
    if (this.order?.id) {
      this.initData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['order'] && !changes['order'].isFirstChange()) {
      const prevId = changes['order'].previousValue?.id;
      const currId = changes['order'].currentValue?.id;
      if (prevId !== currId) {
        this.cleanUpResources();
        this.initData();
      } else {
        this.updateTimer();
      }
    }
  }

  ngOnDestroy(): void {
    this.cleanUpResources();
  }

  private cleanUpResources(): void {
    if (this.wsConnectionSub) {
      this.wsConnectionSub.unsubscribe();
      this.wsConnectionSub = null;
    }
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
    if (this.threadRetryTimeout) {
      clearTimeout(this.threadRetryTimeout);
      this.threadRetryTimeout = null;
    }
    if (this.chatUnsubscribe) {
      this.chatUnsubscribe();
      this.chatUnsubscribe = null;
    }
  }

  private initData(): void {
    if (!this.order?.id) return;
    if (!this.onlyChat) {
      this.loadAgreement();
      this.startTimer();
    }
    this.initChat();
  }

  // ================= AGREEMENT LOGIC =================

  loadAgreement(): void {
    if (!this.order?.id) return;
    this.isLoadingAgreement = true;
    this.agreementError = '';

    this.orderService.getOrderAgreement(this.order.id).subscribe({
      next: (res) => {
        this.agreement = res;
        this.isLoadingAgreement = false;
        this.prefillFormFromAgreement(res);
        this.updateTimer();
      },
      error: (err) => {
        this.isLoadingAgreement = false;
        if (err?.status === 404) {
          // No agreement drafted yet, initialize blank or from order
          this.agreement = null;
          this.initFormDefaults();
        } else {
          this.agreementError = getApiErrorMessage(err, 'Không thể tải thông tin thỏa thuận.');
        }
        this.updateTimer();
      },
    });
  }

  private initFormDefaults(): void {
    if (this.order) {
      this.customUnitPrice = this.order.finalPrice || this.order.totalPrice || 0;
      this.customQuantity = 1;
      this.customDurationDays = 3;
      this.customDescription = this.order.note || '';
      this.customPaymentMethod = this.order.paymentMethod === 'ONLINE' ? 'ONLINE' : 'COD';
      if (this.order.items && this.order.items.length > 0) {
        const first = this.order.items[0];
        if (first.description) this.customDescription = first.description;
        if (first.quantity) this.customQuantity = first.quantity;
        if (first.price) this.customUnitPrice = first.price;
        if (first.productionDurationDays) this.customDurationDays = first.productionDurationDays;
        if (first.imageUrls) this.customImageUrls = [...first.imageUrls];
        this.customProductTypeName = first.productTypeName || '';
        const values = first.fieldValues || {};
        this.customFieldEntries = (first.productTypeFields || [])
          .filter((field) => values[field.code] !== null && values[field.code] !== undefined && values[field.code] !== '')
          .map((field) => ({ label: field.label, value: `${Array.isArray(values[field.code]) ? (values[field.code] as unknown[]).join(', ') : values[field.code]}${field.unit ? ` ${field.unit}` : ''}` }));
        if (first.specSnapshot && !this.customProductTypeName) {
          try {
            const snapshot = JSON.parse(first.specSnapshot);
            this.customProductTypeName = snapshot.productType?.name || '';
          } catch { /* legacy snapshot */ }
        }
      }
    }
  }

  private prefillFormFromAgreement(ag: OrderAgreement): void {
    if (ag.itemSnapshot) {
      try {
        const parsed = JSON.parse(ag.itemSnapshot);
        if (parsed.description) this.customDescription = parsed.description;
        if (parsed.quantity) this.customQuantity = parsed.quantity;
        if (parsed.unitPrice) this.customUnitPrice = parsed.unitPrice;
        if (parsed.productionDurationDays) this.customDurationDays = parsed.productionDurationDays;
        if (Array.isArray(parsed.imageUrls)) this.customImageUrls = [...parsed.imageUrls];
        if (parsed.paymentMethod === 'ONLINE' || parsed.paymentMethod === 'COD') {
          this.customPaymentMethod = parsed.paymentMethod;
        }
        if (parsed.note) this.customNote = parsed.note;
      } catch {
        // Plain text snapshot
        if (!this.customDescription) {
          this.customDescription = ag.itemSnapshot;
        }
      }
    }
    if (ag.userVoucherId) {
      this.customUserVoucherId = ag.userVoucherId;
    }
  }

  onImageSelected(event: any): void {
    const file: File = event?.target?.files?.[0];
    if (!file) return;

    this.isUploadingImage = true;
    const formData = new FormData();
    formData.append('file', file);

    this.http
      .post<ApiResponse<{ url: string }> | { url: string }>(`${environment.apiUrl}/upload/image`, formData)
      .pipe(unwrapApiResponse)
      .subscribe({
        next: (res: any) => {
          const url = res?.url || res;
          if (typeof url === 'string') {
            this.customImageUrls.push(url);
          }
          this.isUploadingImage = false;
        },
        error: (err) => {
          this.isUploadingImage = false;
          this.toast.notify('Tải ảnh thất bại: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        },
      });
  }

  removeImage(index: number): void {
    this.customImageUrls.splice(index, 1);
  }

  submitUserAgreement(): void {
    if (!this.order?.id) return;
    if (this.isCustomOrder && !this.customDescription.trim()) {
      this.toast.notify('Vui lòng nhập mô tả chi tiết yêu cầu thỏa thuận.');
      return;
    }

    this.isSubmittingAgreement = true;
    const payload: SubmitOrderAgreementRequest = {
      orderVersion: this.order.version ?? 0,
      description: this.isCustomOrder ? this.customDescription.trim() : undefined,
      imageUrls: this.isCustomOrder ? this.customImageUrls : undefined,
      quantity: this.isCustomOrder ? Number(this.customQuantity) : undefined,
      unitPrice: this.isCustomOrder ? Number(this.customUnitPrice) : undefined,
      productionDurationDays: this.isCustomOrder ? Number(this.customDurationDays) : undefined,
      paymentMethod: this.isCustomOrder ? this.customPaymentMethod : undefined,
      userVoucherId: this.customUserVoucherId || undefined,
      note: this.customNote.trim() || undefined,
    };

    const idempotencyKey = this.orderService.generateIdempotencyKey('user-agreement', this.order.id);

    this.orderService.submitOrderAgreement(this.order.id, payload, idempotencyKey).subscribe({
      next: (updatedAgreement) => {
        this.isSubmittingAgreement = false;
        this.agreement = updatedAgreement;
        this.toast.notify('Đã gửi đề xuất thỏa thuận thành công!');
        this.orderUpdated.emit();
        this.updateTimer();
      },
      error: (err) => {
        this.isSubmittingAgreement = false;
        if (err?.status === 409) {
          this.toast.notify('Dữ liệu đơn hàng đã được cập nhật bởi phiên khác, đang làm mới...');
          this.loadAgreement();
          this.orderUpdated.emit();
        } else {
          this.toast.notify('Gửi thỏa thuận thất bại: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        }
      },
    });
  }

  openDecisionDialog(decision: OrderAgreementDecision): void {
    this.staffDecision = decision;
    this.staffDecisionReason = '';
    this.showDecisionModal = true;
  }

  closeDecisionDialog(): void {
    this.showDecisionModal = false;
    this.staffDecisionReason = '';
  }

  submitStaffDecision(): void {
    if (!this.order?.id) return;
    if (this.staffDecision === 'REQUEST_CHANGES' && !this.staffDecisionReason.trim()) {
      this.toast.notify('Vui lòng nhập lý do / nội dung yêu cầu khách chỉnh sửa.');
      return;
    }

    this.isDecidingAgreement = true;
    const payload: OrderAgreementDecisionRequest = {
      orderVersion: this.order.version ?? 0,
      agreementVersion: this.agreement?.agreementVersion ?? 0,
      decision: this.staffDecision,
      reason: this.staffDecisionReason.trim() || undefined,
    };

    const idempotencyKey = this.orderService.generateIdempotencyKey('staff-agreement-decision', this.order.id);

    this.orderService.decideOrderAgreement(this.order.id, payload, idempotencyKey).subscribe({
      next: (res) => {
        this.isDecidingAgreement = false;
        this.showDecisionModal = false;
        this.agreement = res;
        const msg = this.staffDecision === 'CONFIRM' ? 'Đã chốt thỏa thuận thành công!' : 'Đã gửi yêu cầu chỉnh sửa cho khách hàng.';
        this.toast.notify(msg);
        this.orderUpdated.emit();
        this.updateTimer();
      },
      error: (err) => {
        this.isDecidingAgreement = false;
        if (err?.status === 409) {
          this.toast.notify('Thỏa thuận đã được cập nhật bởi thao tác khác, đang làm mới...');
          this.loadAgreement();
          this.orderUpdated.emit();
        } else {
          this.toast.notify('Xử lý thất bại: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        }
      },
    });
  }

  // ================= 24H COUNTDOWN TIMER =================

  private startTimer(): void {
    this.updateTimer();
    if (this.timerIntervalId) clearInterval(this.timerIntervalId);
    this.timerIntervalId = setInterval(() => this.updateTimer(), 1000);
  }

  private updateTimer(): void {
    const agreementSubmittedAt = this.agreement?.submittedAt;
    const dueAtStr = this.order?.confirmationDueAt || this.agreement?.confirmationDueAt;

    if (this.isTerminalOrder) {
      this.countdownPastDue = false;
      this.timerStopped = true;
      this.countdownDisplay = '';
      this.timerStoppedText = '';
      if (this.timerIntervalId) {
        clearInterval(this.timerIntervalId);
        this.timerIntervalId = null;
      }
      return;
    }

    // Rule: Timer stops immediately upon valid submission, does not restart on REQUEST_CHANGES
    if (agreementSubmittedAt) {
      this.countdownPastDue = false;
      this.timerStopped = true;
      this.countdownDisplay = '';
      this.timerStoppedText = 'Đã nộp đề xuất thỏa thuận';
      if (this.timerIntervalId) {
        clearInterval(this.timerIntervalId);
        this.timerIntervalId = null;
      }
      return;
    }

    if (!dueAtStr) {
      this.countdownPastDue = false;
      this.timerStopped = true;
      this.countdownDisplay = '';
      this.timerStoppedText = '';
      return;
    }

    const dueTime = new Date(dueAtStr).getTime();
    const now = Date.now();
    const diff = Math.floor((dueTime - now) / 1000);

    if (diff <= 0) {
      this.countdownPastDue = true;
      this.countdownDisplay = '00:00:00 (Hết hạn)';
      return;
    }

    this.countdownPastDue = false;
    this.timerStopped = false;

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    this.countdownDisplay = `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  private pad(n: number): string {
    return n < 10 ? '0' + n : String(n);
  }

  // ================= CHAT LOGIC =================

  get hasAssignedStaff(): boolean {
    if (!this.order) return false;
    if (this.order.staffId || this.order.staffName) return true;
    const s = (this.order.status || '').toUpperCase();
    return s === 'DISCUSSING' || s === 'WAITING_STAFF_CONFIRMATION' || s === 'ORDER_ACCEPTED' || s === 'ORDER_CREATING';
  }

  refreshOrderState(): void {
    this.orderUpdated.emit();
    this.initData();
  }

  private initChat(): void {
    if (!this.order?.id) return;
    this.isLoadingChat = true;
    this.chatError = '';
    this.isThreadPreparing = false;
    this.threadRetryCount = 0;

    if (!this.hasAssignedStaff && this.mode === 'USER') {
      this.isLoadingChat = false;
      return;
    }

    this.fetchChatThreadAndMessages();
  }

  private fetchChatThreadAndMessages(): void {
    if (!this.order?.id) return;

    this.orderService.getOrderChatThread(this.order.id).subscribe({
      next: (thread: OrderChatThread) => {
        this.isThreadPreparing = false;
        this.isLoadingChat = false;
        this.chatError = '';
        this.loadChatMessages();
        this.subscribeChatWs();
      },
      error: (err) => {
        if (err?.status === 404 && this.threadRetryCount < 8) {
          // Thread being prepared asynchronously by backend - retry with backoff
          this.isThreadPreparing = true;
          this.threadRetryCount++;
          const delay = Math.min(3000, 1000 + (this.threadRetryCount - 1) * 500);
          this.threadRetryTimeout = setTimeout(() => {
            this.fetchChatThreadAndMessages();
          }, delay);
        } else {
          this.isLoadingChat = false;
          this.isThreadPreparing = false;
          if (err?.status === 404) {
            this.chatError = 'Kênh trao đổi đang được tạo bởi hệ thống. Vui lòng thử lại sau giây lát.';
          } else {
            this.chatError = getApiErrorMessage(err, 'Không thể kết nối kênh trao đổi.');
          }
        }
      },
    });
  }

  retryInitChat(): void {
    this.initChat();
  }

  loadChatMessages(): void {
    if (!this.order?.id) return;

    this.isLoadingChat = true;
    this.orderService.getOrderChatMessages(this.order.id).subscribe({
      next: (msgs: OrderChatMessage[]) => {
        this.isLoadingChat = false;
        this.messageIdSet.clear();
        this.messages = [];
        (msgs || []).forEach((m) => this.appendMessage(m));
        this.scrollToBottom();
      },
      error: (err) => {
        this.isLoadingChat = false;
        this.chatError = getApiErrorMessage(err, 'Không thể tải tin nhắn.');
      },
    });
  }

  private subscribeChatWs(): void {
    if (!this.order?.id) return;
    if (this.chatUnsubscribe) {
      this.chatUnsubscribe();
    }

    this.chatUnsubscribe = this.websocketService.subscribeToOrderChat(this.order.id, (message: OrderChatMessage) => {
      this.appendMessage(message);
      this.scrollToBottom();
    });
  }

  private appendMessage(msg: OrderChatMessage): void {
    if (!msg || !msg.id) return;
    if (this.messageIdSet.has(msg.id)) return;
    this.messageIdSet.add(msg.id);
    this.messages.push(msg);
  }

  sendMessage(): void {
    const text = this.chatInput.trim();
    if (!text || text.length > 4000 || !this.order?.id || this.isSendingMessage) return;

    this.isSendingMessage = true;
    const orderId = this.order.id;

    // Try WebSocket publish first
    const published = this.websocketService.sendOrderChat(orderId, text);
    if (published) {
      this.chatInput = '';
      this.isSendingMessage = false;
      this.scrollToBottom();
    } else {
      // Fallback to REST endpoint
      this.orderService.sendOrderChatMessage(orderId, text).subscribe({
        next: (created) => {
          this.isSendingMessage = false;
          this.chatInput = '';
          this.appendMessage(created);
          this.scrollToBottom();
        },
        error: (err) => {
          this.isSendingMessage = false;
          this.toast.notify('Gửi tin nhắn thất bại: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
        },
      });
    }
  }

  onChatKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatScrollContainer?.nativeElement) {
        const el = this.chatScrollContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }

  isOwnMessage(msg: OrderChatMessage): boolean {
    if (!msg) return false;

    const role = (msg.senderRole || '').toUpperCase();
    if (this.mode === 'USER') {
      if (role === 'STAFF' || role === 'MANAGER') return false;
      if (role === 'USER') return true;
    } else if (this.mode === 'STAFF') {
      if (role === 'USER') return false;
      if (role === 'STAFF' || role === 'MANAGER') return true;
    }

    if (!this.currentUserId || !msg.senderId) return false;
    return String(msg.senderId) === String(this.currentUserId);
  }

  getSenderRoleBadge(msg: OrderChatMessage): string {
    const role = (msg.senderRole || '').toUpperCase();
    if (role.includes('STAFF')) return 'Nhân viên';
    if (role.includes('MANAGER')) return 'Quản lý';
    return 'Khách hàng';
  }
}
