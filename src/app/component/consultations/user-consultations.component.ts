import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject as injectToast } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import { ChatMessage, ChatUser } from '../../model/chat.model';
import { AuthService } from '../../service/auth.service';
import { ChatService } from '../../service/chat.service';
import { ConsultationService } from '../../service/consultation.service';
import { ToastService } from '../../service/toast.service';

@Component({
  selector: 'app-user-consultations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-consultations.component.html',
  styleUrls: ['../../app.css', './user-consultations.component.css'],
})
export class UserConsultationsComponent implements OnInit, AfterViewChecked, OnDestroy {
  private readonly toast = injectToast(ToastService);
  @ViewChild('chatBody') private chatBody!: ElementRef;

  threads: ChatUser[] = [];
  selectedThread: ChatUser | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  isLoadingThreads = false;
  isLoadingMessages = false;
  private stompClient: any;

  constructor(
    private readonly chatService: ChatService,
    private readonly consultationService: ConsultationService,
    public readonly authService: AuthService,
  ) {}

  ngOnInit() {
    this.loadThreads();
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

  loadThreads() {
    this.isLoadingThreads = true;
    this.chatService.getChattedUsers().subscribe({
      next: (threads) => {
        this.threads = threads.filter((thread) => !!this.getRequestId(thread));
        this.isLoadingThreads = false;
        if (this.selectedThread && !this.threads.some((thread) => this.getThreadKey(thread) === this.getThreadKey(this.selectedThread))) {
          this.selectedThread = null;
          this.messages = [];
        }
      },
      error: () => {
        this.isLoadingThreads = false;
        this.toast.notify('Khong the tai danh sach tu van.');
      },
    });
  }

  selectThread(thread: ChatUser) {
    this.selectedThread = thread;
    this.loadSelectedHistory();
  }

  sendMessage() {
    const requestId = this.getRequestId(this.selectedThread);
    const userId = this.authService.getUserId();
    if (!requestId || !userId || !this.stompClient?.connected || this.newMessage.trim() === '') {
      return;
    }

    const content = this.newMessage.trim();
    this.newMessage = '';
    const chatMsg: ChatMessage = {
      userId,
      content,
      isShopSender: false,
      shopSender: false,
      adminSender: false,
      messageType: 'TEXT',
      consultationRequestId: requestId,
      productId: this.selectedThread?.productId ?? null,
      timestamp: new Date().toISOString(),
    };

    this.stompClient.send('/app/chat.send', {}, JSON.stringify(chatMsg));
    this.messages.push(chatMsg);
  }

  closeThread() {
    const requestId = this.getRequestId(this.selectedThread);
    if (!requestId) return;
    if (!confirm('Dong doan tu van nay? Lich su chat cua thread nay se duoc xoa.')) {
      return;
    }

    this.consultationService.close(requestId).subscribe({
      next: () => {
        this.toast.notify('Da dong yeu cau tu van.');
        this.selectedThread = null;
        this.messages = [];
        this.loadThreads();
      },
      error: () => this.toast.notify('Khong the dong yeu cau tu van nay.'),
    });
  }

  getThreadKey(thread: ChatUser | null): string {
    if (!thread) return '';
    return String(thread.chatThreadId ?? thread.consultationRequestId ?? `legacy-${thread.id}`);
  }

  getThreadTitle(thread: ChatUser | null): string {
    if (!thread) return '';
    return thread.chatTitle || thread.productName || 'Tư vấn sản phẩm';
  }

  getCustomerName(thread: ChatUser | null): string {
    if (!thread) return '';
    const fullName = `${thread.lastname || ''} ${thread.firstname || ''}`.trim();
    return fullName || thread.email || 'Ban';
  }

  getSenderLabel(message: ChatMessage): string {
    if (!message.isShopSender) {
      return 'Ban';
    }
    return message.senderName || message.assignedStaffName || this.selectedThread?.assignedStaffName || 'Nhan vien tu van';
  }

  private loadSelectedHistory() {
    const requestId = this.getRequestId(this.selectedThread);
    if (!requestId) return;
    this.isLoadingMessages = true;
    this.chatService.getConsultationChatHistory(requestId, this.selectedThread?.productId).subscribe({
      next: (messages) => {
        this.messages = messages.map((message) => this.normalizeMessage(message));
        this.isLoadingMessages = false;
      },
      error: () => {
        this.isLoadingMessages = false;
        this.toast.notify('Khong the tai lich su chat.');
      },
    });
  }

  private connectWebSocket() {
    const userId = this.authService.getUserId();
    if (!userId) return;

    const socket = new SockJS(environment.wsUrl);
    this.stompClient = Stomp.over(socket);
    this.stompClient.debug = () => {};
    this.stompClient.connect({ userId: String(userId) }, () => {
      this.stompClient.subscribe(`/topic/chat/user/${userId}`, (msg: any) => {
        const receivedMessage = this.normalizeMessage(JSON.parse(msg.body));
        if (this.isSelectedMessage(receivedMessage)) {
          this.messages.push(receivedMessage);
        }
        if (receivedMessage.consultationRequestId) {
          this.loadThreads();
        }
      });
    });
  }

  private normalizeMessage(message: ChatMessage): ChatMessage {
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
    const requestId = this.getRequestId(this.selectedThread);
    return !!requestId && message.consultationRequestId === requestId;
  }

  private getRequestId(thread: ChatUser | null): number | null {
    return thread?.chatThreadId ?? thread?.consultationRequestId ?? null;
  }

  private scrollToBottom() {
    try {
      if (this.chatBody) {
        this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
      }
    } catch {}
  }
}
