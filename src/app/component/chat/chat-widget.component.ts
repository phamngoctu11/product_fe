import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ChatService } from '../../service/chat.service';
import { AuthService } from '../../service/auth.service';
// 🚨 Import Model và Environment
import { environment } from '../../../environments/environment';

import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { ChatMessage } from '../../model/chat.model';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html'
})
export class ChatWidgetComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatBody') private chatBody!: ElementRef;

  isOpen = false;
  messages: ChatMessage[] = [];
  newMessage = '';
  userId: number = 0;
  private stompClient: any;

  constructor(
    private chatService: ChatService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    if (this.authService.isLoggedIn() && !this.authService.isAdmin()) {
      const storedId = localStorage.getItem('userId');
      if (storedId) {
        this.userId = Number(storedId);
        this.loadChatHistory();
        this.connectWebSocket();
      }
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  loadChatHistory() {
    if (this.userId === 0) return;
    this.chatService.getChatHistory(this.userId).subscribe({
      next: (res) => this.messages = res,
      error: (err) => console.error(">>> Lỗi tải lịch sử chat:", err)
    });
  }

  connectWebSocket() {
    try {
      // 🚨 Sử dụng đường dẫn từ file Environment
      const socket = new SockJS(environment.wsUrl);
      this.stompClient = Stomp.over(socket);
      this.stompClient.debug = () => {};

      this.stompClient.connect({}, () => {
        console.log(">>> WebSocket Chat (Khách hàng) đã kết nối thành công!");

        this.stompClient.subscribe(`/topic/chat/user/${this.userId}`, (msg: any) => {
          const receivedMessage: ChatMessage = JSON.parse(msg.body);
          this.messages.push(receivedMessage);
        });
      }, (error: any) => {
        console.error(">>> WebSocket bị mất kết nối:", error);
      });
    } catch (e) {
      console.error(">>> Lỗi khởi tạo SockJS/Stomp:", e);
    }
  }

  sendMessage() {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn(">>> Máy chủ đang kết nối, vui lòng thử lại trong giây lát...");
      return;
    }

    if (this.newMessage.trim() === '') return;

    const chatMsg: ChatMessage = {
      userId: this.userId,
      content: this.newMessage,
      isAdminSender: false
    };

    this.stompClient.send('/app/chat.send', {}, JSON.stringify(chatMsg));
    this.newMessage = '';
  }

  private scrollToBottom(): void {
    try {
      if (this.chatBody) {
        this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }
}
