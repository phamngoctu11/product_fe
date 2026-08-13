import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChatMessage } from '../../../../model/chat.model';

@Component({
  selector: 'app-chat-message-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './chat-message-list.component.html',
  styleUrl: './chat-message-list.component.css',
})
export class ChatMessageListComponent {
  @Input() messages: readonly ChatMessage[] = [];
  @Input() loading = false;
  @Input() alignShopRight = false;
  @Input() showPeerAvatar = false;
  @Input() peerAvatar: string | null = null;
  @Input() peerName = '';
  @Input() currentUserId: string | number | null = null;

  isRight(message: ChatMessage): boolean {
    return this.alignShopRight ? message.isShopSender : !message.isShopSender;
  }

  senderLabel(message: ChatMessage): string {
    if (this.alignShopRight) {
      if (message.isShopSender && this.currentUserId != null && String(message.senderId) === String(this.currentUserId)) {
        return 'Bạn';
      }
      return message.isShopSender
        ? message.senderName || message.assignedStaffName || 'Nhân viên tư vấn'
        : this.peerName || 'Khách hàng';
    }
    return message.isShopSender
      ? message.senderName || message.assignedStaffName || 'Nhân viên tư vấn'
      : 'Bạn';
  }

  getInitial(name: string): string {
    return (name || 'K').trim().charAt(0).toUpperCase();
  }

  productTags(message: ChatMessage): string[] {
    return String(message.productData?.tags || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
}
