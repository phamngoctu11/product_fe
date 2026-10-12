import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Order,
  AvailableStaff,
  ManagerOrderReviewDetail,
  ManagerOrderReviewSummary,
  ManagerReviewRequest,
  ManagerReviewResult,
  OrderAssignmentQueueItem,
  OrderAssignmentResult,
  OrderListDTO,
  OrderStatusHistory,
  ReceiptComplaintRequest,
  ReceiptConfirmRequest,
  ReceiptConfirmResponse,
  ReorderResponse,
} from '../model/order.model';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { PageResponse } from '../model/page-response.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  getMyOrders(
    page: number = 0,
    size: number = 20,
    minPrice: number | null = null,
    maxPrice: number | null = null,
  ): Observable<PageResponse<OrderListDTO>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (minPrice !== null) params = params.set('minPrice', minPrice.toString());
    if (maxPrice !== null) params = params.set('maxPrice', maxPrice.toString());
    return this.http
      .get<ApiResponse<PageResponse<OrderListDTO>> | PageResponse<OrderListDTO>>(`${this.apiUrl}/me`, { params })
      .pipe(map(unwrapApiResponse));
  }

  getMyCancelledOrders(
    page: number = 0,
    size: number = 20,
    minPrice: number | null = null,
    maxPrice: number | null = null,
  ): Observable<PageResponse<OrderListDTO>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (minPrice !== null) params = params.set('minPrice', minPrice.toString());
    if (maxPrice !== null) params = params.set('maxPrice', maxPrice.toString());
    return this.http
      .get<ApiResponse<PageResponse<OrderListDTO>> | PageResponse<OrderListDTO>>(`${this.apiUrl}/me/cancelled`, { params })
      .pipe(map(unwrapApiResponse));
  }

  getById(id: number): Observable<Order> {
    return this.http
      .get<ApiResponse<Order> | Order>(`${this.apiUrl}/${id}`)
      .pipe(map(unwrapApiResponse));
  }

  getManagerReviews(page: number = 0, size: number = 20): Observable<PageResponse<ManagerOrderReviewSummary>> {
    const params = this.pageParams(page, size);
    return this.http
      .get<ApiResponse<PageResponse<ManagerOrderReviewSummary>> | PageResponse<ManagerOrderReviewSummary>>(
        `${this.apiUrl}/manager/reviews`,
        { params },
      )
      .pipe(map(unwrapApiResponse));
  }

  getManagerReviewDetail(orderId: number): Observable<ManagerOrderReviewDetail> {
    return this.http
      .get<ApiResponse<ManagerOrderReviewDetail> | ManagerOrderReviewDetail>(
        `${this.apiUrl}/manager/reviews/${orderId}`,
      )
      .pipe(map(unwrapApiResponse));
  }

  getManagerAssignmentQueue(page: number = 0, size: number = 20): Observable<PageResponse<OrderAssignmentQueueItem>> {
    const params = this.pageParams(page, size);
    return this.http
      .get<ApiResponse<PageResponse<OrderAssignmentQueueItem>> | PageResponse<OrderAssignmentQueueItem>>(
        `${this.apiUrl}/manager/assignments`,
        { params },
      )
      .pipe(map(unwrapApiResponse));
  }

  getAvailableStaff(page: number = 0, size: number = 50): Observable<PageResponse<AvailableStaff>> {
    const params = this.pageParams(page, size);
    return this.http
      .get<ApiResponse<PageResponse<AvailableStaff>> | PageResponse<AvailableStaff>>(
        `${this.apiUrl}/manager/available-staff`,
        { params },
      )
      .pipe(map(unwrapApiResponse));
  }

  cancelOrder(orderId: number, reason: string): Observable<string> {
    const params = new HttpParams().set('reason', reason);
    return this.http.put(`${this.apiUrl}/${orderId}/cancel`, null, {
      params,
      responseType: 'text',
    });
  }

  reorderOrder(orderId: number): Observable<ReorderResponse> {
    return this.http
      .post<ApiResponse<ReorderResponse> | ReorderResponse>(`${this.apiUrl}/${orderId}/reorder`, null)
      .pipe(map(unwrapApiResponse));
  }

  confirmReceipt(orderId: number, request: ReceiptConfirmRequest): Observable<ReceiptConfirmResponse> {
    return this.http
      .post<ApiResponse<ReceiptConfirmResponse> | ReceiptConfirmResponse>(`${this.apiUrl}/customer/confirm-receipt/${orderId}`, request)
      .pipe(map(unwrapApiResponse));
  }

  sendReceiptComplaint(orderId: number, request: ReceiptComplaintRequest): Observable<ReceiptConfirmResponse> {
    return this.http
      .post<ApiResponse<ReceiptConfirmResponse> | ReceiptConfirmResponse>(`${this.apiUrl}/customer/receipt-complaint/${orderId}`, request)
      .pipe(map(unwrapApiResponse));
  }

  getOrderHistory(orderId: number): Observable<OrderStatusHistory[]> {
    return this.http
      .get<ApiResponse<OrderStatusHistory[]> | OrderStatusHistory[]>(`${this.apiUrl}/${orderId}/history`)
      .pipe(map(unwrapApiResponse));
  }

  reviewOrder(orderId: number, request: ManagerReviewRequest): Observable<ManagerReviewResult> {
    return this.http
      .post<ApiResponse<ManagerReviewResult> | ManagerReviewResult>(
        `${this.apiUrl}/manager/reviews/${orderId}`,
        request,
        { headers: this.idempotencyHeaders('manager-review', orderId) },
      )
      .pipe(map(unwrapApiResponse));
  }

  assignStaff(orderId: number, orderVersion: number, staffId: string): Observable<OrderAssignmentResult> {
    return this.http
      .post<ApiResponse<OrderAssignmentResult> | OrderAssignmentResult>(
        `${this.apiUrl}/manager/assignments/${orderId}`,
        { orderVersion, staffId },
        { headers: this.idempotencyHeaders('manager-assignment', orderId) },
      )
      .pipe(map(unwrapApiResponse));
  }

  kcsCheck(orderId: number, isPassed: boolean, cancelReason: string = ''): Observable<string> {
    const params = new HttpParams()
      .set('isPassed', String(isPassed))
      .set('cancelReason', cancelReason);
    return this.http
      .post<ApiResponse<null> | string>(`${this.apiUrl}/manager/kcs-check/${orderId}`, null, { params })
      .pipe(map((response: any) => this.extractMessage(response, isPassed ? 'KCS đạt, đơn chuyển sang giao hàng!' : 'KCS không đạt, đơn đã trả về staff.')));
  }

  getClaimableOrders(page: number = 0, size: number = 20): Observable<PageResponse<OrderAssignmentQueueItem>> {
    const params = this.pageParams(page, size);
    return this.http
      .get<ApiResponse<PageResponse<OrderAssignmentQueueItem>> | PageResponse<OrderAssignmentQueueItem>>(
        `${this.apiUrl}/staff/claimable`,
        { params },
      )
      .pipe(map(unwrapApiResponse));
  }

  claimOrder(orderId: number, orderVersion: number): Observable<OrderAssignmentResult> {
    return this.http
      .post<ApiResponse<OrderAssignmentResult> | OrderAssignmentResult>(
        `${this.apiUrl}/staff/claim/${orderId}`,
        { orderVersion },
        { headers: this.idempotencyHeaders('staff-claim', orderId) },
      )
      .pipe(map(unwrapApiResponse));
  }

  getMyStaffOrders(page: number = 0, size: number = 20): Observable<PageResponse<OrderListDTO>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http
      .get<ApiResponse<PageResponse<OrderListDTO>> | PageResponse<OrderListDTO>>(`${this.apiUrl}/staff/my-orders`, { params })
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

  getGuestOrder(orderId: number, token: string): Observable<Order> {
    const params = new HttpParams().set('token', token);
    return this.http
      .get<ApiResponse<Order> | Order>(`${environment.apiUrl}/guest/orders/${orderId}`, { params })
      .pipe(map(unwrapApiResponse));
  }

  private pageParams(page: number, size: number): HttpParams {
    return new HttpParams().set('page', String(page)).set('size', String(size));
  }

  private idempotencyHeaders(scope: string, orderId: number): HttpHeaders {
    const randomPart = typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new HttpHeaders({ 'Idempotency-Key': `${scope}-${orderId}-${randomPart}` });
  }

  getGuestOrderHistory(orderId: number, token: string): Observable<OrderStatusHistory[]> {
    const params = new HttpParams().set('token', token);
    return this.http
      .get<ApiResponse<OrderStatusHistory[]> | OrderStatusHistory[]>(`${environment.apiUrl}/guest/orders/${orderId}/history`, { params })
      .pipe(map(unwrapApiResponse));
  }

  confirmGuestReceipt(orderId: number, token: string, request: ReceiptConfirmRequest): Observable<ReceiptConfirmResponse> {
    const params = new HttpParams().set('token', token);
    return this.http
      .post<ApiResponse<ReceiptConfirmResponse> | ReceiptConfirmResponse>(`${environment.apiUrl}/guest/orders/${orderId}/confirm-receipt`, request, { params })
      .pipe(map(unwrapApiResponse));
  }

}
