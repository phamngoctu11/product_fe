import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Order,
  OrderAgreement,
  OrderAgreementDecisionRequest,
  OrderChatMessage,
  OrderChatThread,
  SubmitOrderAgreementRequest,
  AvailableStaff,
  ManagerOrderReviewDetail,
  ManagerOrderReviewSummary,
  ManagerReviewRequest,
  ManagerReviewResult,
  OrderAssignmentQueueItem,
  OrderAssignmentResult,
  OrderListDTO,
  OrderCancellationResult,
  OrderStatusHistory,
  ReceiptConfirmRequest,
  ReceiptConfirmResponse,
  ReceiptViewDTO,
  ShippingHandoverRequest,
  ShippingHandoverResponse,
  ReorderResponse,
  ReorderResponseDTO,
  PaymentAttempt,
  StartProductionResult,
  OrderChangeRequest,
  CreateOrderChangeRequest,
  DecideOrderChangeRequest,
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

  cancelOrder(orderId: number, orderVersion: number, reason: string): Observable<OrderCancellationResult> {
    const key = this.generateIdempotencyKey('user-cancel', orderId);
    const headers = new HttpHeaders({ 'Idempotency-Key': key });
    return this.http
      .post<ApiResponse<OrderCancellationResult> | OrderCancellationResult>(
        `${this.apiUrl}/${orderId}/cancellation`,
        { orderVersion, reason },
        { headers },
      )
      .pipe(map(unwrapApiResponse));
  }

  shippingHandover(
    orderId: number,
    request: ShippingHandoverRequest,
    idempotencyKey?: string
  ): Observable<ShippingHandoverResponse> {
    const key = idempotencyKey || this.generateIdempotencyKey('staff-shipping-handover', orderId);
    const headers = new HttpHeaders({ 'Idempotency-Key': key });
    return this.http
      .post<ApiResponse<ShippingHandoverResponse> | ShippingHandoverResponse>(
        `${this.apiUrl}/staff/${orderId}/shipping-handover`,
        request,
        { headers }
      )
      .pipe(map(unwrapApiResponse));
  }

  getReceiptView(orderId: number): Observable<ReceiptViewDTO> {
    return this.http
      .get<ApiResponse<ReceiptViewDTO> | ReceiptViewDTO>(`${this.apiUrl}/${orderId}/receipt`)
      .pipe(map(unwrapApiResponse));
  }

  confirmReceipt(
    orderId: number,
    request: ReceiptConfirmRequest,
    idempotencyKey?: string
  ): Observable<ReceiptConfirmResponse> {
    const key = idempotencyKey || this.generateIdempotencyKey('user-receipt', orderId);
    const headers = new HttpHeaders({ 'Idempotency-Key': key });
    return this.http
      .post<ApiResponse<ReceiptConfirmResponse> | ReceiptConfirmResponse>(
        `${this.apiUrl}/${orderId}/receipt`,
        request,
        { headers }
      )
      .pipe(map(unwrapApiResponse));
  }

  reorder(orderId: number, idempotencyKey?: string): Observable<ReorderResponseDTO> {
    const key = idempotencyKey || this.generateIdempotencyKey('user-reorder', orderId);
    const headers = new HttpHeaders({ 'Idempotency-Key': key });
    return this.http
      .post<ApiResponse<ReorderResponseDTO> | ReorderResponseDTO>(
        `${this.apiUrl}/${orderId}/reorder`,
        null,
        { headers }
      )
      .pipe(map(unwrapApiResponse));
  }

  reorderOrder(orderId: number, idempotencyKey?: string): Observable<ReorderResponseDTO> {
    return this.reorder(orderId, idempotencyKey);
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

  getGuestReceiptView(orderId: number, token: string): Observable<ReceiptViewDTO> {
    const params = new HttpParams().set('token', token);
    return this.http
      .get<ApiResponse<ReceiptViewDTO> | ReceiptViewDTO>(
        `${environment.apiUrl}/guest/orders/${orderId}/receipt`,
        { params }
      )
      .pipe(map(unwrapApiResponse));
  }

  confirmGuestReceipt(
    orderId: number,
    token: string,
    request: ReceiptConfirmRequest,
    idempotencyKey?: string
  ): Observable<ReceiptConfirmResponse> {
    const params = new HttpParams().set('token', token);
    const key = idempotencyKey || this.generateIdempotencyKey('guest-receipt', orderId);
    const headers = new HttpHeaders({ 'Idempotency-Key': key });
    return this.http
      .post<ApiResponse<ReceiptConfirmResponse> | ReceiptConfirmResponse>(
        `${environment.apiUrl}/guest/orders/${orderId}/receipt`,
        request,
        { params, headers }
      )
      .pipe(map(unwrapApiResponse));
  }

  getOrderAgreement(orderId: number): Observable<OrderAgreement> {
    return this.http
      .get<ApiResponse<OrderAgreement> | OrderAgreement>(`${this.apiUrl}/${orderId}/agreement`)
      .pipe(map(unwrapApiResponse));
  }

  submitOrderAgreement(orderId: number, request: SubmitOrderAgreementRequest, idempotencyKey?: string): Observable<OrderAgreement> {
    const key = idempotencyKey || this.generateIdempotencyKey('user-agreement', orderId);
    const headers = new HttpHeaders({ 'Idempotency-Key': key });
    return this.http
      .post<ApiResponse<OrderAgreement> | OrderAgreement>(
        `${this.apiUrl}/${orderId}/agreement/submissions`,
        request,
        { headers }
      )
      .pipe(map(unwrapApiResponse));
  }

  decideOrderAgreement(orderId: number, request: OrderAgreementDecisionRequest, idempotencyKey?: string): Observable<OrderAgreement> {
    const key = idempotencyKey || this.generateIdempotencyKey('staff-agreement-decision', orderId);
    const headers = new HttpHeaders({ 'Idempotency-Key': key });
    return this.http
      .post<ApiResponse<OrderAgreement> | OrderAgreement>(
        `${this.apiUrl}/staff/${orderId}/agreement/decisions`,
        request,
        { headers }
      )
      .pipe(map(unwrapApiResponse));
  }

  getOrderChatThread(orderId: number): Observable<OrderChatThread> {
    return this.http
      .get<ApiResponse<OrderChatThread> | OrderChatThread>(`${this.apiUrl}/${orderId}/chat`)
      .pipe(map(unwrapApiResponse));
  }

  getOrderChatMessages(orderId: number): Observable<OrderChatMessage[]> {
    return this.http
      .get<ApiResponse<OrderChatMessage[]> | OrderChatMessage[]>(`${this.apiUrl}/${orderId}/chat/messages`)
      .pipe(map(unwrapApiResponse));
  }

  sendOrderChatMessage(orderId: number, content: string): Observable<OrderChatMessage> {
    return this.http
      .post<ApiResponse<OrderChatMessage> | OrderChatMessage>(
        `${this.apiUrl}/${orderId}/chat/messages`,
        { orderId, content }
      )
      .pipe(map(unwrapApiResponse));
  }

  openPaymentAttempt(orderId: number, idempotencyKey?: string): Observable<PaymentAttempt> {
    const key = idempotencyKey || this.generateIdempotencyKey('user-payment-open', orderId);
    const headers = new HttpHeaders({ 'Idempotency-Key': key });
    return this.http
      .post<ApiResponse<PaymentAttempt> | PaymentAttempt>(
        `${environment.apiUrl}/payments/orders/${orderId}/attempts`,
        null,
        { headers }
      )
      .pipe(map(unwrapApiResponse));
  }

  getPaymentStatus(orderId: number): Observable<PaymentAttempt> {
    return this.http
      .get<ApiResponse<PaymentAttempt> | PaymentAttempt>(
        `${environment.apiUrl}/payments/orders/${orderId}/status`
      )
      .pipe(map(unwrapApiResponse));
  }

  startProduction(orderId: number, idempotencyKey?: string): Observable<StartProductionResult> {
    const key = idempotencyKey || this.generateIdempotencyKey('staff-start-production', orderId);
    const headers = new HttpHeaders({ 'Idempotency-Key': key });
    return this.http
      .post<ApiResponse<StartProductionResult> | StartProductionResult>(
        `${this.apiUrl}/staff/${orderId}/start-production`,
        null,
        { headers }
      )
      .pipe(map(unwrapApiResponse));
  }

  getChangeRequests(orderId: number): Observable<OrderChangeRequest[]> {
    return this.http
      .get<ApiResponse<OrderChangeRequest[]> | OrderChangeRequest[]>(`${this.apiUrl}/${orderId}/change-requests`)
      .pipe(map(unwrapApiResponse));
  }

  createChangeRequest(
    orderId: number,
    request: CreateOrderChangeRequest,
    idempotencyKey?: string,
  ): Observable<OrderChangeRequest> {
    const key = idempotencyKey || this.generateIdempotencyKey('user-change-request', orderId);
    return this.http
      .post<ApiResponse<OrderChangeRequest> | OrderChangeRequest>(
        `${this.apiUrl}/${orderId}/change-requests`,
        request,
        { headers: new HttpHeaders({ 'Idempotency-Key': key }) },
      )
      .pipe(map(unwrapApiResponse));
  }

  decideChangeRequest(
    orderId: number,
    changeRequestId: number,
    request: DecideOrderChangeRequest,
    idempotencyKey?: string,
  ): Observable<OrderChangeRequest> {
    const key = idempotencyKey || this.generateIdempotencyKey('staff-change-request', orderId);
    return this.http
      .post<ApiResponse<OrderChangeRequest> | OrderChangeRequest>(
        `${this.apiUrl}/staff/${orderId}/change-requests/${changeRequestId}/decision`,
        request,
        { headers: new HttpHeaders({ 'Idempotency-Key': key }) },
      )
      .pipe(map(unwrapApiResponse));
  }

  generateIdempotencyKey(scope: string, orderId: number): string {
    const randomPart = typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${scope}-${orderId}-${randomPart}`;
  }
}
