import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { environment } from '../../../../environments/environment';
import { ChatUser, ChatMessage } from '../../../model/chat.model';
import { AuthService } from '../../../service/auth.service';
import { ChatService } from '../../../service/chat.service';

@Component({
  selector: 'app-admin-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-chat.component.html'
})
export class AdminChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatBody') private chatBody!: ElementRef;

  users: ChatUser[] = [];
  selectedUser: ChatUser | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  private stompClient: any;

  constructor(private chatService: ChatService, public authService: AuthService) {}

  ngOnInit() {
    this.loadChattedUsers();
    this.connectWebSocket();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  loadChattedUsers() {
    this.chatService.getChattedUsers().subscribe({
      next: (res) => this.users = res,
      error: (err) => console.error(">>> Lỗi tải danh sách khách hàng:", err)
    });
  }

  selectUser(user: ChatUser) {
    this.selectedUser = user;
    this.chatService.getChatHistory(user.id).subscribe({
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
        console.log(">>> WebSocket Chat (Admin) đã kết nối thành công!");

        this.stompClient.subscribe('/topic/chat/admin', (msg: any) => {
          const receivedMessage: ChatMessage = JSON.parse(msg.body);

          if (this.selectedUser && receivedMessage.userId === this.selectedUser.id) {
            this.messages.push(receivedMessage);
          }

          if (!this.users.find(u => u.id === receivedMessage.userId)) {
            this.loadChattedUsers();
          }
        });
      }, (error: any) => {
        console.error(">>> WebSocket Admin bị mất kết nối:", error);
      });
    } catch (e) {
      console.error(">>> Lỗi khởi tạo SockJS/Stomp bên Admin:", e);
    }
  }

  sendMessage() {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn(">>> Máy chủ đang kết nối, vui lòng chờ trong giây lát...");
      return;
    }

    if (this.newMessage.trim() === '' || !this.selectedUser) return;

    const chatMsg: ChatMessage = {
      userId: this.selectedUser.id,
      content: this.newMessage,
      isAdminSender: true
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
