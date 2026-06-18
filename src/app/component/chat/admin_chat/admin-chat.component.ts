import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject as injectToast } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../../environments/environment';
import { ChatMessage, ChatUser } from '../../../model/chat.model';
import { ConsultationRequest } from '../../../model/consultation.model';
import { AuthService } from '../../../service/auth.service';
import { ChatService } from '../../../service/chat.service';
import { ConsultationService } from '../../../service/consultation.service';
import { ToastService } from '../../../service/toast.service';
import { UserService } from '../../../service/user.service';
import { UserResListDTO } from '../../../model/user.model';

@Component({
  selector: 'app-admin-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-chat.component.html',
})
export class AdminChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  private readonly toast = injectToast(ToastService);
  @ViewChild('chatBody') private chatBody!: ElementRef;

  users: ChatUser[] = [];
  selectedUser: ChatUser | null = null;
  selectedConsultation: ConsultationRequest | null = null;
  waitingConsultations: ConsultationRequest[] = [];
  myConsultations: ConsultationRequest[] = [];
  staffUsers: UserResListDTO[] = [];
  selectedStaffByRequest: Record<number, number | null> = {};
  consultationTab: 'waiting' | 'mine' = 'waiting';
  messages: ChatMessage[] = [];
  newMessage = '';
  private stompClient: any;

  constructor(
    private chatService: ChatService,
    private consultationService: ConsultationService,
    private userService: UserService,
    public authService: AuthService,
  ) {}

  ngOnInit() {
    this.loadConsultations();
    if (this.canAssignConsultations()) {
      this.loadStaffUsers();
    }
    this.loadChattedUsers();
    this.connectWebSocket();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    if (this.stompClient?.connected) {
      this.stompClient.disconnect();
    }
  }

  loadChattedUsers() {
    this.chatService.getChattedUsers().subscribe({
      next: (res) => {
        this.users = res;
        this.sortUsers();
      },
      error: (err) => console.error('Cannot load chat users:', err),
    });
  }

  loadConsultations() {
    this.consultationService.getWaiting().subscribe({
      next: (page) => this.waitingConsultations = page.content,
      error: (err) => console.error('Cannot load waiting consultations:', err),
    });

    if (this.authService.isStaff()) {
      this.consultationService.getMyAssigned().subscribe({
        next: (page) => {
          this.myConsultations = page.content;
          this.loadChattedUsers();
        },
        error: (err) => console.error('Cannot load assigned consultations:', err),
      });
    }
  }

  loadStaffUsers() {
    this.userService.getAll(0, 100).subscribe({
      next: (page) => this.staffUsers = page.content.filter((user) => user.role === 'STAFF'),
      error: (err) => console.error('Cannot load staff users:', err),
    });
  }

  sortUsers() {
    this.users.sort((a, b) => Number(!!b.isActive) - Number(!!a.isActive));
  }

  canAssignConsultations(): boolean {
    return this.authService.isAdmin();
  }

  canReplyInSelectedChat(): boolean {
    return this.authService.isStaff() && !!this.selectedUser?.consultationRequestId;
  }

  isConversationObserver(): boolean {
    return this.authService.isAdmin();
  }

  selectUser(user: ChatUser) {
    this.selectedUser = user;
    this.selectedConsultation = this.toConsultationFromChatUser(user);
    this.loadSelectedUserHistory();
  }

  openConsultation(consultation: ConsultationRequest) {
    this.selectedConsultation = consultation;
    this.selectedUser = {
      id: consultation.userId,
      firstname: consultation.customerName,
      lastname: '',
      email: '',
      avatarUrl: null,
      chatThreadId: consultation.id,
      consultationRequestId: consultation.id,
      productId: consultation.productId,
      productName: consultation.productName,
      productImageUrl: consultation.productImageUrl ?? null,
      assignedStaffId: consultation.assignedStaffId ?? null,
      assignedStaffName: consultation.assignedStaffName ?? null,
      assignedByManagerId: consultation.assignedByManagerId ?? null,
      assignedByManagerName: consultation.assignedByManagerName ?? null,
      chatTitle: `${consultation.customerName} - ${consultation.productName}`,
    };
    this.loadSelectedUserHistory();
  }

  claimConsultation(consultation: ConsultationRequest) {
    this.consultationService.claim(consultation.id).subscribe({
      next: (updated) => {
        this.toast.notify('Da nhan yeu cau tu van.');
        this.loadConsultations();
        this.openConsultation(updated);
      },
      error: () => {
        this.toast.notify('Yeu cau nay khong con kha dung. Danh sach se duoc tai lai.');
        this.loadConsultations();
      },
    });
  }

  assignConsultation(consultation: ConsultationRequest) {
    const staffId = this.selectedStaffByRequest[consultation.id];
    if (!staffId) {
      this.toast.notify('Vui long chon nhan vien de gan yeu cau.');
      return;
    }

    this.consultationService.assign(consultation.id, staffId).subscribe({
      next: () => {
        this.toast.notify('Da gan yeu cau tu van cho staff.');
        this.loadConsultations();
        this.loadChattedUsers();
      },
      error: () => {
        this.toast.notify('Khong the gan yeu cau nay. Danh sach se duoc tai lai.');
        this.loadConsultations();
      },
    });
  }

  connectWebSocket() {
    try {
      const socket = new SockJS(environment.wsUrl);
      this.stompClient = Stomp.over(socket);
      this.stompClient.debug = () => {};

      const userId = this.authService.getUserId();
      this.stompClient.connect(userId ? { userId: String(userId) } : {}, () => {
        if (this.authService.isAdmin()) {
          this.stompClient.subscribe('/topic/chat/admin', (msg: any) => {
            const receivedMessage = this.normalizeIncomingMessage(JSON.parse(msg.body));
            if (this.isSelectedMessage(receivedMessage)) {
              this.messages.push(receivedMessage);
            }
            if (receivedMessage.consultationRequestId) {
              this.loadConsultations();
            }
            if (!this.users.find((user) => this.getThreadKey(user) === this.getMessageThreadKey(receivedMessage))) {
              this.loadChattedUsers();
            }
          });
        }

        if (this.authService.isStaff() && userId) {
          this.stompClient.subscribe(`/topic/chat/staff/${userId}`, (msg: any) => {
            const receivedMessage = this.normalizeIncomingMessage(JSON.parse(msg.body));
            if (this.isSelectedMessage(receivedMessage)) {
              this.messages.push(receivedMessage);
            }
            if (receivedMessage.consultationRequestId) {
              this.loadConsultations();
              this.loadChattedUsers();
            }
          });
        }

        this.stompClient.subscribe('/topic/chat/admin/status', (msg: any) => {
          const statusUpdate = JSON.parse(msg.body);
          const userIndex = this.users.findIndex((user) => user.id === statusUpdate.userId);
          if (userIndex !== -1) {
            this.users[userIndex].isActive = statusUpdate.isActive;
            this.sortUsers();
          }
        });
      });
    } catch (error) {
      console.error('Cannot initialize chat websocket:', error);
    }
  }

  sendMessage() {
    if (!this.canReplyInSelectedChat() || !this.stompClient?.connected || this.newMessage.trim() === '' || !this.selectedUser) {
      return;
    }

    const content = this.newMessage.trim();
    this.newMessage = '';

    const chatMsg: ChatMessage = {
      userId: this.selectedUser.id,
      content,
      isShopSender: true,
      shopSender: true,
      adminSender: false,
      messageType: 'TEXT',
      consultationRequestId: this.selectedUser.consultationRequestId ?? this.selectedConsultation?.id ?? null,
      timestamp: new Date().toISOString(),
    };

    this.stompClient.send('/app/chat.send', {}, JSON.stringify(chatMsg));
  }

  getUserDisplayName(user: ChatUser | null): string {
    if (!user) return '';
    const fullName = `${user.lastname || ''} ${user.firstname || ''}`.trim();
    return fullName || user.email || 'Khach hang';
  }

  getStaffDisplayName(): string {
    return this.selectedUser?.assignedStaffName
      || this.selectedConsultation?.assignedStaffName
      || 'Chua co nhan vien phu trach';
  }

  getSenderLabel(message: ChatMessage): string {
    if (!message.isShopSender) {
      return this.getUserDisplayName(this.selectedUser);
    }
    if (this.authService.isStaff() && message.senderId === this.authService.getUserId()) {
      return 'Ban';
    }
    return message.senderName || message.assignedStaffName || this.getStaffDisplayName();
  }

  private loadSelectedUserHistory() {
    if (!this.selectedUser) return;
    const requestId = this.selectedUser.consultationRequestId ?? this.selectedConsultation?.id ?? null;
    const history$ = requestId
      ? this.chatService.getConsultationChatHistory(requestId, this.selectedUser.productId)
      : this.chatService.getChatHistory(this.selectedUser.id);

    history$.subscribe({
      next: (res) => this.messages = res.map((message) => this.normalizeIncomingMessage(message)),
      error: (err) => console.error('Cannot load chat history:', err),
    });
  }

  private scrollToBottom(): void {
    try {
      if (this.chatBody) {
        this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
      }
    } catch (error) {
      console.warn('Cannot scroll chat body:', error);
    }
  }

  private normalizeIncomingMessage(message: ChatMessage): ChatMessage {
    const rawMessage = message as ChatMessage & { shopSender?: boolean; adminSender?: boolean };
    const normalized = {
      ...message,
      isShopSender: rawMessage.isShopSender ?? rawMessage.shopSender ?? rawMessage.adminSender ?? false,
    };
    if (normalized.messageType === 'PRODUCT' && normalized.content) {
      try {
        normalized.productData = JSON.parse(normalized.content);
      } catch (error) {
        console.warn('Cannot parse product chat message:', error);
      }
    }
    return normalized;
  }

  private isSelectedMessage(message: ChatMessage): boolean {
    if (!this.selectedUser) return false;
    const selectedRequestId = this.selectedUser.consultationRequestId ?? this.selectedConsultation?.id ?? null;
    if (selectedRequestId && message.consultationRequestId) {
      return message.consultationRequestId === selectedRequestId;
    }
    return message.userId === this.selectedUser.id;
  }

  getThreadKey(user: ChatUser | null): string {
    if (!user) return '';
    return String(user.chatThreadId ?? user.consultationRequestId ?? `legacy-${user.id}`);
  }

  private getMessageThreadKey(message: ChatMessage): string {
    return String(message.consultationRequestId ?? `legacy-${message.userId}`);
  }

  private toConsultationFromChatUser(user: ChatUser): ConsultationRequest | null {
    if (!user.consultationRequestId) return null;
    return {
      id: user.consultationRequestId,
      userId: user.id,
      customerName: this.getUserDisplayName(user),
      productId: user.productId ?? 0,
      productName: user.productName ?? '',
      productImageUrl: user.productImageUrl ?? null,
      status: 'ASSIGNED',
      assignedStaffId: user.assignedStaffId ?? null,
      assignedStaffName: user.assignedStaffName ?? null,
      assignedByManagerId: user.assignedByManagerId ?? null,
      assignedByManagerName: user.assignedByManagerName ?? null,
      createdAt: '',
    };
  }
}
