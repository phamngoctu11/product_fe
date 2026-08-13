import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { CartRes } from '../model/cart.model';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private apiUrl = `${environment.apiUrl}/cart`;

  constructor(private http: HttpClient) {}
  private checkoutSuccessSource = new Subject<void>();

  checkoutSuccess$ = this.checkoutSuccessSource.asObservable();

  notifyCheckoutSuccess() {
    this.checkoutSuccessSource.next();
  }

  getCartByUserId(userId: string): Observable<CartRes> {
    return this.http
      .get<ApiResponse<CartRes> | CartRes>(this.apiUrl)
      .pipe(map(unwrapApiResponse));
  }

  addToCart(userId: string, variantId: number, quantity: number): Observable<any> {
    const params = new HttpParams()
      .set('variantId', variantId.toString())
      .set('quantity', quantity.toString());

    return this.http
      .post<ApiResponse<void> | void>(`${this.apiUrl}/items`, null, { params })
      .pipe(map(unwrapApiResponse));
  }

  updateQuantity(userId: string, variantId: number, quantity: number): Observable<any> {
    const params = new HttpParams()
      .set('quantity', quantity.toString());

    return this.http
      .put<ApiResponse<void> | void>(`${this.apiUrl}/items/${variantId}`, null, { params })
      .pipe(map(unwrapApiResponse));
  }

  removeFromCart(userId: string, variantId: number): Observable<any> {
    return this.http
      .delete<ApiResponse<void> | void>(`${this.apiUrl}/items/${variantId}`)
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
  ): Observable<any> {
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
    return this.http.post<ApiResponse<any> | any>(`${this.apiUrl}/approve/${userId}`, productIds, {
      params: params,
      headers,
    }).pipe(map(unwrapApiResponse));
  }

}
