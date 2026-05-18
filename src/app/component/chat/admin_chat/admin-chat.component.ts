import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router'; // 🚨 THÊM IMPORT NÀY
import { ChatUser, ChatMessage } from '../../../model/chat.model';
import { AuthService } from '../../../service/auth.service';
import { ChatService } from '../../../service/chat.service';
import { environment } from '../../../../environments/environment';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

@Component({
  selector: 'app-admin-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule], // 🚨 THÊM RouterModule VÀO ĐÂY
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

  ngAfterViewChecked() { this.scrollToBottom(); }

  loadChattedUsers() {
    this.chatService.getChattedUsers().subscribe({
      next: (res) => {
        this.users = res;
        this.sortUsers();
      },
      error: (err) => console.error("Lỗi:", err)
    });
  }

  sortUsers() {
    this.users.sort((a, b) => {
      if (a.isActive === b.isActive) return 0;
      return a.isActive ? -1 : 1;
    });
  }

  selectUser(user: ChatUser) {
    this.selectedUser = user;
    this.chatService.getChatHistory(user.id).subscribe({
      next: (res) => {
        // 🚨 GIẢI MÃ DỮ LIỆU KHI TẢI LỊCH SỬ
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
      const socket = new SockJS(environment.wsUrl);
      this.stompClient = Stomp.over(socket);
      this.stompClient.debug = () => {};


      this.stompClient.connect({}, () => {
        this.stompClient.subscribe('/topic/chat/admin', (msg: any) => {
          const receivedMessage: ChatMessage = JSON.parse(msg.body);

          // 🚨 GIẢI MÃ DỮ LIỆU KHI NHẬN TIN NHẮN MỚI
          if (receivedMessage.messageType === 'PRODUCT' && receivedMessage.content) {
            try { receivedMessage.productData = JSON.parse(receivedMessage.content); } catch(e) {}
          }

          if (this.selectedUser && receivedMessage.userId === this.selectedUser.id) {
            this.messages.push(receivedMessage);
          }
          if (!this.users.find(u => u.id === receivedMessage.userId)) {
            this.loadChattedUsers();
          }
        });

        this.stompClient.subscribe('/topic/chat/admin/status', (msg: any) => {
          const statusUpdate = JSON.parse(msg.body);
          const userIndex = this.users.findIndex(u => u.id === statusUpdate.userId);
          if (userIndex !== -1) {
            this.users[userIndex].isActive = statusUpdate.isActive;
            this.sortUsers();
          }
        });

      });
    } catch (e) {}
  }

  sendMessage() {
    if (!this.stompClient || !this.stompClient.connected || this.newMessage.trim() === '' || !this.selectedUser) return;

    const chatMsg: ChatMessage = {
      userId: this.selectedUser.id,
      content: this.newMessage,
      adminSender: true,
      messageType: 'TEXT' // Mặc định Admin gõ phím là TEXT
    };

    this.stompClient.send('/app/chat.send', {}, JSON.stringify(chatMsg));
    this.newMessage = '';
  }

  private scrollToBottom(): void {
    try { if (this.chatBody) this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight; } catch(err) { }
  }
}
