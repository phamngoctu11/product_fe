import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, DoCheck } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  templateUrl: './chat-widget.component.html'
})
export class ChatWidgetComponent implements OnInit, AfterViewChecked, DoCheck {
  @ViewChild('chatBody') private chatBody!: ElementRef;

  isOpen = false;
  messages: ChatMessage[] = [];
  newMessage = '';
  userId: number = 0;
  private stompClient: any;

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
        alert("Đang kết nối lại với máy chủ Chat. Vui lòng thử lại sau 2 giây!");
        this.connectWebSocket(); // Thử gọi lại kết nối
        return;
      }

      // 3. Đóng gói Thẻ Sản phẩm
      const chatMsg: ChatMessage = {
        userId: this.userId,
        content: JSON.stringify({
          name: productInfo.name,
          price: productInfo.price,
          imageUrl: productInfo.imageUrl
        }),
        adminSender: false,
        messageType: 'PRODUCT',
        productId: productInfo.id
      };

      // 4. Bắn đi cho Admin
      this.stompClient.send('/app/chat.send', {}, JSON.stringify(chatMsg));

      // 5. In lên màn hình của Khách
      chatMsg.productData = {
        name: productInfo.name,
        price: productInfo.price,
        imageUrl: productInfo.imageUrl
      };
      this.messages.push(chatMsg);

      setTimeout(() => this.scrollToBottom(), 100);
    });
  }
  ngDoCheck() {
    const storedId = localStorage.getItem('user_id');
    const currentId = storedId ? Number(storedId) : 0;

    if (this.authService.isLoggedIn() && !this.authService.isAdmin() && currentId !== this.userId) {
      this.userId = currentId;
      if (this.userId > 0) {
        this.loadChatHistory();
        this.connectWebSocket();
      }
    } else if (!this.authService.isLoggedIn() && this.userId !== 0) {
      this.disconnectChat();
    }
  }

  ngAfterViewChecked() { this.scrollToBottom(); }

  toggleChat() {console.log("đây là nút ấn vào thẻ sản phẩm");
   this.isOpen = !this.isOpen; }

  disconnectChat() {
    this.userId = 0;
    this.messages = [];
    this.isOpen = false;
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.disconnect();
    }
  }

  loadChatHistory() {
    if (this.userId === 0) return;
    this.chatService.getChatHistory(this.userId).subscribe({
      next: (res) => {
        // 🚨 GIẢI MÃ LỊCH SỬ CHAT
        this.messages = res.map(msg => {
          if (msg.messageType === 'PRODUCT' && msg.content) {
            try { msg.productData = JSON.parse(msg.content); } catch(e) {}
          }
          return msg;
        });
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

        this.stompClient.subscribe(`/topic/chat/user/${this.userId}`, (msg: any) => {
          const receivedMessage: ChatMessage = JSON.parse(msg.body);

          // 🚨 GIẢI MÃ TIN NHẮN MỚI NHẬN
          if (receivedMessage.messageType === 'PRODUCT' && receivedMessage.content) {
            try { receivedMessage.productData = JSON.parse(receivedMessage.content); } catch(e) {}
          }

          this.messages.push(receivedMessage);
        });
      });
    } catch (e) {
      console.error(">>> Lỗi kết nối WebSocket:", e);
    }
  }

  sendMessage() {
    if (this.userId === 0 || !this.stompClient || !this.stompClient.connected || this.newMessage.trim() === '') return;

    const chatMsg: ChatMessage = {
      userId: this.userId,
      content: this.newMessage,
      adminSender: false,
      messageType: 'TEXT'
    };

    this.stompClient.send('/app/chat.send', {}, JSON.stringify(chatMsg));
    this.newMessage = '';
  }

  private scrollToBottom(): void {
    try { if (this.chatBody) this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight; } catch(err) { }
  }
}
