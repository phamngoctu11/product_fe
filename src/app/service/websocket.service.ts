import { Injectable } from '@angular/core';
import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { OrderChatMessage } from '../model/order.model';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private client: Client;
  private notificationSubject = new Subject<any>();
  public notifications$ = this.notificationSubject.asObservable();

  private isAdminState = false;
  private userIdState: string | null = null;
  private adminNotificationSub: StompSubscription | null = null;
  private userNotificationSub: StompSubscription | null = null;

  private orderChatListeners = new Map<number, Set<(message: OrderChatMessage) => void>>();
  private orderChatStompSubs = new Map<number, StompSubscription>();

  constructor(private authService: AuthService) {
    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl),
      debug: (str) => {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });
  }

  connect(isAdmin: boolean = false, userId: string | null = null) {
    this.isAdminState = isAdmin;
    this.userIdState = userId;

    const token = this.authService.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (userId) headers['userId'] = String(userId);
    this.client.connectHeaders = headers;

    this.client.beforeConnect = () => {
      const freshToken = this.authService.getToken();
      const freshHeaders: Record<string, string> = {};
      if (freshToken) freshHeaders['Authorization'] = `Bearer ${freshToken}`;
      if (this.userIdState) freshHeaders['userId'] = String(this.userIdState);
      this.client.connectHeaders = freshHeaders;
    };

    this.client.onConnect = (frame) => {
      // 1. NẾU LÀ ADMIN -> Nghe kênh báo đơn hàng mới / hủy đơn chung
      if (this.isAdminState) {
        if (this.adminNotificationSub) {
          try { this.adminNotificationSub.unsubscribe(); } catch {}
          this.adminNotificationSub = null;
        }
        this.adminNotificationSub = this.client.subscribe('/topic/admin-notifications', (message) => {
          if (message.body) {
            try { this.notificationSubject.next(JSON.parse(message.body)); } catch {}
          }
        });
      }

      // 2. TẤT CẢ USER ĐĂNG NHẬP -> Đều được nghe kênh cá nhân của chính mình
      if (this.userIdState) {
        if (this.userNotificationSub) {
          try { this.userNotificationSub.unsubscribe(); } catch {}
          this.userNotificationSub = null;
        }
        this.userNotificationSub = this.client.subscribe('/topic/user-notifications/' + this.userIdState, (message) => {
          if (message.body) {
            try { this.notificationSubject.next(JSON.parse(message.body)); } catch {}
          }
        });
      }

      // 3. Khôi phục tất cả subscription order chat đang mở
      this.orderChatStompSubs.clear();
      this.orderChatListeners.forEach((callbacks, orderId) => {
        if (callbacks.size > 0) {
          this.subscribeOrderChatStomp(orderId);
        }
      });
    };

    this.client.onStompError = (frame) => {
      console.error('Lỗi Stomp: ' + frame.headers['message']);
    };

    if (!this.client.active) {
      this.client.activate();
    }
  }

  /**
   * Subscribe động /topic/order-chat/{orderId}
   * Trả về hàm cleanup hủy subscription.
   */
  subscribeToOrderChat(orderId: number, callback: (message: OrderChatMessage) => void): () => void {
    if (!this.orderChatListeners.has(orderId)) {
      this.orderChatListeners.set(orderId, new Set());
    }
    const listenerSet = this.orderChatListeners.get(orderId)!;
    listenerSet.add(callback);

    if (this.client.connected && !this.orderChatStompSubs.has(orderId)) {
      this.subscribeOrderChatStomp(orderId);
    } else if (!this.client.active) {
      this.connect(this.isAdminState, this.userIdState || this.authService.getUserId());
    }

    return () => {
      this.unsubscribeFromOrderChat(orderId, callback);
    };
  }

  unsubscribeFromOrderChat(orderId: number, callback?: (message: OrderChatMessage) => void): void {
    if (callback) {
      const listeners = this.orderChatListeners.get(orderId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.orderChatListeners.delete(orderId);
          this.cleanupOrderChatStompSub(orderId);
        }
      }
    } else {
      this.orderChatListeners.delete(orderId);
      this.cleanupOrderChatStompSub(orderId);
    }
  }

  private subscribeOrderChatStomp(orderId: number): void {
    if (this.orderChatStompSubs.has(orderId)) {
      this.cleanupOrderChatStompSub(orderId);
    }
    const sub = this.client.subscribe(`/topic/order-chat/${orderId}`, (message) => {
      if (message.body) {
        try {
          const parsed: OrderChatMessage = JSON.parse(message.body);
          const listeners = this.orderChatListeners.get(orderId);
          if (listeners) {
            listeners.forEach((cb) => {
              try { cb(parsed); } catch (e) { console.error('Lỗi trong chat listener:', e); }
            });
          }
        } catch (e) {
          console.error('Không thể parse message order-chat:', e);
        }
      }
    });
    this.orderChatStompSubs.set(orderId, sub);
  }

  private cleanupOrderChatStompSub(orderId: number): void {
    const sub = this.orderChatStompSubs.get(orderId);
    if (sub) {
      try { sub.unsubscribe(); } catch {}
      this.orderChatStompSubs.delete(orderId);
    }
  }

  isOrderChatConnected(): boolean {
    return !!(this.client && this.client.connected);
  }

  sendOrderChat(orderId: number, content: string): boolean {
    if (this.client && this.client.connected) {
      try {
        this.client.publish({
          destination: '/app/order-chat.send',
          body: JSON.stringify({ orderId, content }),
        });
        return true;
      } catch (err) {
        console.error('Không thể gửi tin nhắn order chat qua WebSocket:', err);
        return false;
      }
    }
    return false;
  }

  disconnect() {
    this.orderChatListeners.clear();
    this.orderChatStompSubs.clear();
    if (this.client.active) {
      this.client.deactivate();
      console.log('Đã ngắt kết nối WebSocket.');
    }
  }
}
