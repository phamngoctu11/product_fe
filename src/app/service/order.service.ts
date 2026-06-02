import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Order, OrderStatusHistory } from '../model/order.model';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { PageResponse } from '../model/page-response.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  getOrdersByUserId(userId: number, page: number = 0, size: number = 20): Observable<PageResponse<Order>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http
      .get<ApiResponse<PageResponse<Order>> | PageResponse<Order>>(`${this.apiUrl}/user/${userId}`, { params })
      .pipe(map(unwrapApiResponse));
  }

  getById(id: number): Observable<Order> {
    return this.http
      .get<ApiResponse<Order> | Order>(`${this.apiUrl}/${id}`)
      .pipe(map(unwrapApiResponse));
  }

  getPendingOrders(status: string, page: number = 0, size: number = 20): Observable<PageResponse<Order>> {
    const params = new HttpParams()
      .set('status', status)
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http
      .post<ApiResponse<PageResponse<Order>> | PageResponse<Order>>(`${this.apiUrl}/admin/pending`, null, { params })
      .pipe(map(unwrapApiResponse));
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

  confirmReceipt(orderId: number): Observable<string> {
    return this.http
      .post<ApiResponse<null> | string>(`${this.apiUrl}/customer/confirm-receipt/${orderId}`, null)
      .pipe(map((response: any) => this.extractMessage(response, 'Xác nhận nhận hàng thành công!')));
  }
  getOrderHistory(orderId: number): Observable<OrderStatusHistory[]> {
    return this.http
      .get<ApiResponse<OrderStatusHistory[]> | OrderStatusHistory[]>(`${this.apiUrl}/${orderId}/history`)
      .pipe(map(unwrapApiResponse));
  }
  reviewOrder(orderId: number, approved: boolean, cancelReason: string | null = null, changerId: number, staffId?: number): Observable<string> {
    const payload = {
      approved: approved,
      cancelReason: cancelReason,
    };
    let params = new HttpParams().set('changerId', changerId.toString());
    if (staffId) {
      params = params.set('staffId', staffId.toString());
    }

    return this.http.post(`${this.apiUrl}/manager/review-order/${orderId}`, payload, {
      params,
      responseType: 'text' as 'json',
    }).pipe(
      map((response: any) => {
        if (typeof response === 'string') {
          try {
            const parsed = JSON.parse(response);
            return parsed.message || response;
          } catch {
            return response;
          }
        }

        return response?.message || 'Thao tác thành công!';
      }),
    );
  }

  assignStaff(orderId: number, staffId: number): Observable<string> {
    const params = new HttpParams().set('staffId', staffId.toString());
    return this.http
      .post<ApiResponse<null> | string>(`${this.apiUrl}/manager/assign-staff/${orderId}`, null, { params })
      .pipe(map((response: any) => this.extractMessage(response, 'Gán staff thành công!')));
  }

  kcsCheck(orderId: number, isPassed: boolean): Observable<string> {
    const params = new HttpParams().set('isPassed', String(isPassed));
    return this.http
      .post<ApiResponse<null> | string>(`${this.apiUrl}/manager/kcs-check/${orderId}`, null, { params })
      .pipe(map((response: any) => this.extractMessage(response, isPassed ? 'KCS đạt, đơn chuyển sang giao hàng!' : 'KCS không đạt, đơn đã trả về staff.')));
  }

  getWarehousePendingOrders(page: number = 0, size: number = 20): Observable<PageResponse<Order>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http
      .get<ApiResponse<PageResponse<Order>> | PageResponse<Order>>(`${this.apiUrl}/staff/warehouse-pending`, { params })
      .pipe(map(unwrapApiResponse));
  }

  claimWarehouseOrder(orderId: number): Observable<string> {
    return this.http
      .post<ApiResponse<null> | string>(`${this.apiUrl}/staff/claim/${orderId}`, null)
      .pipe(map((response: any) => this.extractMessage(response, 'Nhận đơn thành công!')));
  }

  getMyStaffOrders(page: number = 0, size: number = 20): Observable<PageResponse<Order>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http
      .get<ApiResponse<PageResponse<Order>> | PageResponse<Order>>(`${this.apiUrl}/staff/my-orders`, { params })
      .pipe(map(unwrapApiResponse));
  }

  exportWarehouseOrder(orderId: number, items: { variantId: number; quantity: number }[]): Observable<string> {
    return this.http
      .post<ApiResponse<null> | string>(`${this.apiUrl}/staff/export/${orderId}`, items)
      .pipe(map((response: any) => this.extractMessage(response, 'Xuất kho thành công!')));
  }

  private extractMessage(response: any, fallback: string): string {
    if (typeof response === 'string') {
      try {
        return JSON.parse(response).message || response;
      } catch {
        return response;
      }
    }

    return response?.message || fallback;
  }
}
