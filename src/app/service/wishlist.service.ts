import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { PageResponse } from '../model/page-response.model';
import { Product } from '../model/product.model';

@Injectable({
  providedIn: 'root',
})
export class WishlistService {
  private readonly apiUrl = `${environment.apiUrl}/wishlist`;

  constructor(private readonly http: HttpClient) {}

  getMyWishlist(page: number = 0, size: number = 20): Observable<PageResponse<Product>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http
      .get<ApiResponse<PageResponse<Product>> | PageResponse<Product>>(this.apiUrl, { params })
      .pipe(map(unwrapApiResponse));
  }

  add(productId: number): Observable<Product> {
    return this.http
      .post<ApiResponse<Product> | Product>(`${this.apiUrl}/${productId}`, null)
      .pipe(map(unwrapApiResponse));
  }

  remove(productId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void> | void>(`${this.apiUrl}/${productId}`)
      .pipe(map(unwrapApiResponse));
  }

  exists(productId: number): Observable<boolean> {
    return this.http
      .get<ApiResponse<boolean> | boolean>(`${this.apiUrl}/${productId}/exists`)
      .pipe(map(unwrapApiResponse));
  }

  existsBatch(productIds: number[]): Observable<Record<number, boolean>> {
    let params = new HttpParams();
    productIds
      .filter((productId) => Number.isFinite(productId) && productId > 0)
      .forEach((productId) => params = params.append('productIds', productId.toString()));

    return this.http
      .get<ApiResponse<Record<number, boolean>> | Record<number, boolean>>(`${this.apiUrl}/exists/batch`, { params })
      .pipe(map(unwrapApiResponse));
  }
}
