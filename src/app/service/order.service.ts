import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Order } from '../model/order.model';
@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private apiUrl = 'http://localhost:8080/api/orders';
  constructor(private http: HttpClient) {}
  getOrdersByUserId(userId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/user/${userId}`);
  }
  updateOrderStatus(orderId: number, status: string, cancellReason: string): Observable<string> {
    const params = new HttpParams().set('status', status).set('cancellReason', cancellReason);
    return this.http.put(`${this.apiUrl}/${orderId}/status`, null, {
      params,
      responseType: 'text', // Vì backend trả về String (ResponseEntity<String>)
    });
  }
}
