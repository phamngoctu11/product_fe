import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { CartRes } from '../model/cart.model';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private apiUrl = 'http://localhost:8080/api/cart';

  constructor(private http: HttpClient) {}
  private checkoutSuccessSource = new Subject<void>();

  checkoutSuccess$ = this.checkoutSuccessSource.asObservable();

  notifyCheckoutSuccess() {
    this.checkoutSuccessSource.next();
  }

  getCartByUserId(userId: number): Observable<CartRes> {
    return this.http.get<CartRes>(`${this.apiUrl}/${userId}`);
  }

  addToCart(userId: number, variantId: number, quantity: number): Observable<any> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('variantId', variantId.toString())
      .set('quantity', quantity.toString());

    return this.http.post(`${this.apiUrl}/add`, null, { params, responseType: 'text' as 'json' });
  }

  updateQuantity(userId: number, variantId: number, quantity: number): Observable<any> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('variantId', variantId.toString())
      .set('quantity', quantity.toString());

    return this.http.put(`${this.apiUrl}/update`, null, { params, responseType: 'text' as 'json' });
  }

  removeFromCart(userId: number, variantId: number): Observable<any> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('variantId', variantId.toString());

    return this.http.delete(`${this.apiUrl}/remove`, { params, responseType: 'text' as 'json' });
  }

  // ĐÃ SỬA: Giữ nguyên tên hàm acceptCart, thêm paymentMethod vào cuối cùng để không gây lỗi các file khác
  acceptCart(userId: number, productIds: number[], userVoucherId?: number, paymentMethod: string = 'COD', note:string = ''): Observable<any> {
    let params = new HttpParams().set('paymentMethod', paymentMethod)
    if(note)
      params = params.set('note',note)
    if (userVoucherId) {
      params = params.set('userVoucherId', userVoucherId.toString());
    }

    // Backend đang trả về JSON (có status, url, message) nên KHÔNG dùng responseType: 'text' nữa
    return this.http.post<any>(`${this.apiUrl}/approve/${userId}`, productIds, {
      params: params
    });
  }
}
