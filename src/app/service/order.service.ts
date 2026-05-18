import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Order, OrderStatusHistory } from '../model/order.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  getOrdersByUserId(userId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/user/${userId}`);
  }
  getPendingOrders(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/pending`);
  }

  // Giữ nguyên tên hàm này
  updateOrderStatus(orderId: number, status: string): Observable<string> {
    const params = new HttpParams().set('status', status);
    return this.http.put(`${this.apiUrl}/${orderId}/status`, null, {
      params,
      responseType: 'text',
    });
  }

  // Thêm mới API hủy đơn
  cancelOrder(orderId: number, reason: string): Observable<string> {
    const params = new HttpParams().set('reason', reason);
    return this.http.put(`${this.apiUrl}/${orderId}/cancel`, null, {
      params,
      responseType: 'text',
    });
  }
  getOrderHistory(orderId: number): Observable<OrderStatusHistory[]> {
    return this.http.get<OrderStatusHistory[]>(`${this.apiUrl}/${orderId}/history`);
  }
  reviewOrder(orderId: number, approved: boolean, cancelReason: string = '', adminName?: string): Observable<any> {
    const payload = {
      approved: approved,
      cancelReason: cancelReason,
      changer: adminName
    };

    return this.http.post(`${this.apiUrl}/admin/review-order/${orderId}`, payload, { responseType: 'text' as 'json' });
  }
}
