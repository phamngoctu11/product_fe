import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CartRes } from '../model/cart.model';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private apiUrl = 'http://localhost:8080/api/cart';

  constructor(private http: HttpClient) {}

  getCartByUserId(userId: number): Observable<CartRes> {
    return this.http.get<CartRes>(`${this.apiUrl}/${userId}`);
  }

  addToCart(userId: number, productId: number, quantity: number): Observable<string> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('productId', productId.toString())
      .set('quantity', quantity.toString());

    return this.http.post(`${this.apiUrl}/add`, null, {
      params,
      responseType: 'text' as 'json',
    }) as Observable<string>;
  }
  removeFromCart(userId: number, productId: number): Observable<string> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('productId', productId.toString());

    return this.http.delete(`${this.apiUrl}/remove`, {
      params,
      responseType: 'text' as 'json',
    }) as Observable<string>;
  }
  acceptCart(userId: number): Observable<string> {
    return this.http.post(`${this.apiUrl}/approve/${userId}`, null, {
      responseType: 'text' as 'json',
    }) as Observable<string>;
  }
  updateQuantity(userId: number, productId: number, newQuantity: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/update`, null, {
      params: {
        userId: userId.toString(),
        productId: productId.toString(),
        quantity: newQuantity.toString(),
      },
      responseType: 'text',
    });
  }
}
