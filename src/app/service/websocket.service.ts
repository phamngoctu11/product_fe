import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private client: Client;
  private notificationSubject = new Subject<any>();
  public notifications$ = this.notificationSubject.asObservable();

  constructor() {
    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl),
      debug: (str) => {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });
  }

  connect(isAdmin: boolean, userId: number | null) {
    if (!this.client.active) {
      this.client.onConnect = (frame) => {
        console.log('Đã kết nối WebSocket thành công!');

        // 1. NẾU LÀ ADMIN -> Nghe kênh báo đơn hàng mới / hủy đơn chung
        if (isAdmin) {
          this.client.subscribe('/topic/admin-notifications', (message) => {
            if (message.body) {
              this.notificationSubject.next(JSON.parse(message.body));
            }
          });
        }

        // 2. TẤT CẢ USER ĐĂNG NHẬP -> Đều được nghe kênh cá nhân của chính mình (để nhận kết quả duyệt/hủy)
        if (userId) {
          this.client.subscribe('/topic/user-notifications/' + userId, (message) => {
            if (message.body) {
              this.notificationSubject.next(JSON.parse(message.body));
            }
          });
        }
      };

      this.client.onStompError = (frame) => {
        console.error('Lỗi Stomp: ' + frame.headers['message']);
      };

      this.client.activate();
    }
  }

  disconnect() {
    if (this.client.active) {
      this.client.deactivate();
      console.log('Đã ngắt kết nối WebSocket.');
    }
  }
}
