import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { CartRes, CheckoutResponse, GuestCheckoutRequest } from '../model/cart.model';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { GuestSessionService } from './guest-session.service';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly guestSessionHeader = 'X-Guest-Session-Id';
  private apiUrl = `${environment.apiUrl}/cart`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private guestSessionService: GuestSessionService,
  ) {}
  private checkoutSuccessSource = new Subject<void>();

  checkoutSuccess$ = this.checkoutSuccessSource.asObservable();

  notifyCheckoutSuccess() {
    this.checkoutSuccessSource.next();
  }

  getCartByUserId(userId?: string | null): Observable<CartRes> {
    return this.http
      .get<ApiResponse<CartRes> | CartRes>(this.apiUrl, this.withCartOwner())
      .pipe(map(unwrapApiResponse));
  }

  addToCart(userId: string | null | undefined, variantId: number, quantity: number): Observable<any> {
    const params = new HttpParams()
      .set('variantId', variantId.toString())
      .set('quantity', quantity.toString());

    return this.http
      .post<ApiResponse<void> | void>(`${this.apiUrl}/items`, null, this.withCartOwner({ params }))
      .pipe(map(unwrapApiResponse));
  }

  updateQuantity(userId: string | null | undefined, variantId: number, quantity: number): Observable<any> {
    const params = new HttpParams()
      .set('quantity', quantity.toString());

    return this.http
      .put<ApiResponse<void> | void>(`${this.apiUrl}/items/${variantId}`, null, this.withCartOwner({ params }))
      .pipe(map(unwrapApiResponse));
  }

  removeFromCart(userId: string | null | undefined, variantId: number): Observable<any> {
    return this.http
      .delete<ApiResponse<void> | void>(`${this.apiUrl}/items/${variantId}`, this.withCartOwner())
      .pipe(map(unwrapApiResponse));
  }

  guestCheckout(request: GuestCheckoutRequest, idempotencyKey?: string): Observable<CheckoutResponse> {
    const headers = idempotencyKey
      ? new HttpHeaders({ 'Idempotency-Key': idempotencyKey })
      : undefined;

    return this.http
      .post<ApiResponse<CheckoutResponse> | CheckoutResponse>(
        `${environment.apiUrl}/guest-checkout`,
        request,
        this.withCartOwner({ headers }),
      )
      .pipe(map(unwrapApiResponse));
  }

  // ĐÃ SỬA: Giữ nguyên tên hàm acceptCart, thêm paymentMethod vào cuối cùng để không gây lỗi các file khác
  acceptCart(
    userId: string,
    productIds: number[],
    userVoucherId?: number,
    paymentMethod: string = 'COD',
    note:string = '',
    idempotencyKey?: string,
  ): Observable<CheckoutResponse> {
    let params = new HttpParams().set('paymentMethod', paymentMethod)
    if(note)
      params = params.set('note',note)
    if (userVoucherId) {
      params = params.set('userVoucherId', userVoucherId.toString());
    }
    const headers = idempotencyKey
      ? new HttpHeaders({ 'Idempotency-Key': idempotencyKey })
      : undefined;

    // Backend đang trả về JSON (có status, url, message) nên KHÔNG dùng responseType: 'text' nữa
    return this.http.post<ApiResponse<CheckoutResponse> | CheckoutResponse>(`${this.apiUrl}/approve/${userId}`, productIds, {
      params: params,
      headers,
    }).pipe(map(unwrapApiResponse));
  }

  private withCartOwner(options: { params?: HttpParams; headers?: HttpHeaders } = {}): { params?: HttpParams; headers?: HttpHeaders } {
    if (this.authService.isLoggedIn()) {
      return options;
    }

    const headers = (options.headers ?? new HttpHeaders())
      .set(this.guestSessionHeader, this.guestSessionService.getOrCreateSessionId());
    return { ...options, headers };
  }
}
