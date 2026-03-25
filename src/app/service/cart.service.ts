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

  // Biến này để các Component khác (như ProductComponent) Subscribe (lắng nghe)
  checkoutSuccess$ = this.checkoutSuccessSource.asObservable();

  // Hàm này để Component Giỏ hàng gọi khi muốn "phát loa" thông báo
  notifyCheckoutSuccess() {
    this.checkoutSuccessSource.next();
  }

  getCartByUserId(userId: number): Observable<CartRes> {
    return this.http.get<CartRes>(`${this.apiUrl}/${userId}`);
  }

addToCart(userId: number, variantId: number, quantity: number): Observable<any> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      // CHỖ NÀY QUAN TRỌNG NHẤT: Đổi tên key thành 'variantId' cho khớp với Backend
      .set('variantId', variantId.toString())
      .set('quantity', quantity.toString());

    // Gửi POST request với query params
    return this.http.post(`${this.apiUrl}/add`, null, { params, responseType: 'text' as 'json' });
  }

  // Tiện thể sửa luôn các hàm Cập nhật và Xóa giỏ hàng (vì backend cũng đã đổi sang variantId)
  updateQuantity(userId: number, variantId: number, quantity: number): Observable<any> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('variantId', variantId.toString()) // Đổi sang variantId
      .set('quantity', quantity.toString());

    return this.http.put(`${this.apiUrl}/update`, null, { params, responseType: 'text' as 'json' });
  }

  removeFromCart(userId: number, variantId: number): Observable<any> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('variantId', variantId.toString()); // Đổi sang variantId

    return this.http.delete(`${this.apiUrl}/remove`, { params, responseType: 'text' as 'json' });
  }
acceptCart(userId: number, productIds: number[], userVoucherId?: number): Observable<any> {
    let params = new HttpParams();

    if (userVoucherId) {
      params = params.set('userVoucherId', userVoucherId.toString());
    }

    return this.http.post(`${this.apiUrl}/approve/${userId}`, productIds, {
      params: params,
      responseType: 'text'
    });
  }
}
