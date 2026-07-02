import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, DoCheck } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject as injectToast } from '@angular/core';
import { ToastService } from '../../service/toast.service';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router'; // 🚨 THÊM IMPORT NÀY
import { ChatService } from '../../service/chat.service';
import { AuthService } from '../../service/auth.service';
import { environment } from '../../../environments/environment';
import { ChatMessage } from '../../model/chat.model';

declare var SockJS: any;
declare var Stomp: any;

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule], // 🚨 THÊM RouterModule
  templateUrl: './chat-widget.component.html',
  styleUrls: ['../../app.css', './chat-widget.component.css'],
})
export class ChatWidgetComponent implements OnInit, AfterViewChecked, DoCheck {
  private readonly toast = injectToast(ToastService);
  @ViewChild('chatBody') private chatBody!: ElementRef;

  isOpen = false;
  messages: ChatMessage[] = [];
  newMessage = '';
  userId: string = '';
  activeConsultationRequestId: number | null = null;
  activeProductId: number | null = null;
  private stompClient: any;
  private pendingProductMessage: any = null;

  constructor(private chatService: ChatService, public authService: AuthService) {}

  ngOnInit() {
    this.ngDoCheck();

    // Lắng nghe tín hiệu từ Trạm phát sóng
    this.chatService.productQuery$.subscribe((productInfo: any) => {
      console.log(">>> KHUNG CHAT ĐÃ NHẬN ĐƯỢC TÍN HIỆU:", productInfo);

      // 1. Ép Khung chat bật lên
      this.isOpen = true;

      // 2. Kiểm tra WebSocket
      if (!this.stompClient || !this.stompClient.connected) {
        this.toast.notify("Đang kết nối lại với máy chủ Chat. Vui lòng thử lại sau 2 giây!");
        this.connectWebSocket(); // Thử gọi lại kết nối
        return;
      }

      // 3. Đóng gói Thẻ Sản phẩm
      const chatMsg: ChatMessage = {
        userId: this.userId,
        content: JSON.stringify(productInfo),
        isShopSender: false,
        shopSender: false,
        adminSender: false,
        messageType: 'PRODUCT',
        productId: productInfo.id,
        timestamp: new Date().toISOString()
      };

      // 4. Bắn đi cho Admin
      this.stompClient.send('/app/chat.send', {}, JSON.stringify(chatMsg));

      // 5. In lên màn hình của Khách
      chatMsg.productData = productInfo;
      this.messages.push(chatMsg);

      setTimeout(() => this.scrollToBottom(), 100);
    });

    this.chatService.consultation$.subscribe(({ consultation, productData }) => {
      this.activeConsultationRequestId = consultation.id;
      this.activeProductId = consultation.productId ?? productData?.id ?? null;
      this.isOpen = true;
      this.userId = this.authService.getUserId() ?? this.userId;
      this.pendingProductMessage = productData ?? null;
      if (this.userId!=null) {
        this.connectWebSocket();
        this.loadChatHistory(() => this.flushPendingProductMessage());
      }
    });
  }
  ngDoCheck() {
    const storedId = localStorage.getItem('user_id');
    const currentId = storedId ;

    if (this.authService.isLoggedIn() && !this.authService.isAdmin() && currentId !== this.userId) {
      this.userId = currentId || '';
      if (this.userId!=null) {
        this.loadChatHistory();
        this.connectWebSocket();
      }
    } else if (!this.authService.isLoggedIn() && this.userId !== '') {
      this.disconnectChat();
    }
  }

  ngAfterViewChecked() { this.scrollToBottom(); }

  toggleChat() {console.log("đây là nút ấn vào thẻ sản phẩm");
   this.isOpen = !this.isOpen; }

  disconnectChat() {
    this.userId = '';
    this.messages = [];
    this.activeConsultationRequestId = null;
    this.activeProductId = null;
    this.pendingProductMessage = null;
    this.isOpen = false;
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.disconnect();
    }
  }

  loadChatHistory(afterLoad?: () => void) {
    if (this.userId === '') return;
    const history$ = this.activeConsultationRequestId
      ? this.chatService.getConsultationChatHistory(this.activeConsultationRequestId, this.activeProductId)
      : this.chatService.getChatHistory(this.userId);

    history$.subscribe({
      next: (res) => {
        // 🚨 GIẢI MÃ LỊCH SỬ CHAT
        this.messages = res.map(message => {
          const msg = this.normalizeMessage(message);
          if (msg.messageType === 'PRODUCT' && msg.content) {
            try { msg.productData = JSON.parse(msg.content); } catch(e) {}
          }
          return msg;
        });
        afterLoad?.();
      },
      error: (err) => console.error("Lỗi:", err)
    });
  }

  connectWebSocket() {
    try {
      if (this.stompClient && this.stompClient.connected) return;

      const socket = new SockJS(environment.wsUrl);
      this.stompClient = Stomp.over(socket);
      this.stompClient.debug = () => {};

      const headers = { 'userId': String(this.userId) };

      this.stompClient.connect(headers, () => {
        console.log(">>> WebSocket Chat (Khách hàng) đã kết nối!");

        this.flushPendingProductMessage();

        this.stompClient.subscribe(`/topic/chat/user/${this.userId}`, (msg: any) => {
          const receivedMessage: ChatMessage = this.normalizeMessage(JSON.parse(msg.body));

          // 🚨 GIẢI MÃ TIN NHẮN MỚI NHẬN
          if (receivedMessage.messageType === 'PRODUCT' && receivedMessage.content) {
            try { receivedMessage.productData = JSON.parse(receivedMessage.content); } catch(e) {}
          }

          if (this.shouldShowReceivedMessage(receivedMessage)) {
            this.messages.push(receivedMessage);
          }
        });
      });
    } catch (e) {
      console.error(">>> Lỗi kết nối WebSocket:", e);
    }
  }

  sendMessage() {
    if (this.userId === '' || !this.stompClient || !this.stompClient.connected || this.newMessage.trim() === '') return;

    const chatMsg: ChatMessage = {
      userId: this.userId,
      content: this.newMessage.trim(),
      isShopSender: false,
      shopSender: false,
      adminSender: false,
      messageType: 'TEXT',
      consultationRequestId: this.activeConsultationRequestId,
      productId: this.activeProductId,
      timestamp: new Date().toISOString()
    };

    this.stompClient.send('/app/chat.send', {}, JSON.stringify(chatMsg));

    // 5. In ngay lên màn hình của Khách
    this.messages.push(chatMsg);
    setTimeout(() => this.scrollToBottom(), 100);

    this.newMessage = '';
  }

  getSenderLabel(message: ChatMessage): string {
    if (!message.isShopSender) {
      return 'Ban';
    }
    return message.senderName || message.assignedStaffName || 'Nhan vien tu van';
  }

  private scrollToBottom(): void {
    try { if (this.chatBody) this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight; } catch(err) { }
  }

  private normalizeMessage(message: ChatMessage): ChatMessage {
    const rawMessage = message as ChatMessage & { shopSender?: boolean; adminSender?: boolean };
    return {
      ...message,
      isShopSender: rawMessage.isShopSender ?? rawMessage.shopSender ?? rawMessage.adminSender ?? false,
    };
  }

  private flushPendingProductMessage() {
    if (!this.pendingProductMessage || !this.stompClient?.connected || this.userId === '') return;

    const productInfo = this.pendingProductMessage;
    const alreadySentProductCard = this.messages.some((message) =>
      message.messageType === 'PRODUCT'
      && message.consultationRequestId === this.activeConsultationRequestId
      && (message.productId === productInfo.id || message.productData?.id === productInfo.id)
    );
    if (alreadySentProductCard) {
      this.pendingProductMessage = null;
      return;
    }

    const chatMsg: ChatMessage = {
      userId: this.userId,
      content: JSON.stringify(productInfo),
      isShopSender: false,
      shopSender: false,
      adminSender: false,
      messageType: 'PRODUCT',
      productId: productInfo.id,
      consultationRequestId: this.activeConsultationRequestId,
      timestamp: new Date().toISOString()
    };

    this.stompClient.send('/app/chat.send', {}, JSON.stringify(chatMsg));
    chatMsg.productData = productInfo;
    this.messages.push(chatMsg);
    this.pendingProductMessage = null;
    setTimeout(() => this.scrollToBottom(), 100);
  }

  private shouldShowReceivedMessage(message: ChatMessage): boolean {
    if (this.activeConsultationRequestId) {
      return message.consultationRequestId === this.activeConsultationRequestId;
    }
    return !message.consultationRequestId;
  }
}
