import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product, PageResponse } from '../model/product.model';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;
  constructor(private http: HttpClient) {}

  create(product: Product): Observable<Product> {
    return this.http
      .post<ApiResponse<Product> | Product>(this.apiUrl, product)
      .pipe(map(unwrapApiResponse));
  }

  getAll(page: number = 0, size: number = 10): Observable<PageResponse<Product>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http
      .get<ApiResponse<PageResponse<Product>> | PageResponse<Product>>(this.apiUrl, { params })
      .pipe(map(unwrapApiResponse));
  }

  update(id: number, product: Product): Observable<Product> {
    return this.http
      .put<ApiResponse<Product> | Product>(`${this.apiUrl}/${id}`, product)
      .pipe(map(unwrapApiResponse));
  }

  getById(id: number): Observable<Product> {
    return this.http
      .get<ApiResponse<Product> | Product>(`${this.apiUrl}/${id}`)
      .pipe(map(unwrapApiResponse));
  }
  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.apiUrl}/${id}`, { responseType: 'text' as 'json' });
  }
}
