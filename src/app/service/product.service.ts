import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BestSellingProduct, Product, PageResponse, ProductVariant, StockImportRequest } from '../model/product.model';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;
  constructor(private http: HttpClient) {}

  create(product: Product, userId: number): Observable<Product> {
    const params = new HttpParams().set('userId', userId.toString());
    return this.http
      .post<ApiResponse<Product> | Product>(this.apiUrl, product, { params })
      .pipe(map(unwrapApiResponse));
  }

  getAll(page: number = 0, size: number = 10): Observable<PageResponse<Product>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http
      .get<ApiResponse<PageResponse<Product>> | PageResponse<Product>>(this.apiUrl, { params })
      .pipe(map(unwrapApiResponse));
  }

  getBestSelling(period: string = 'day', page: number = 0, size: number = 5): Observable<BestSellingProduct[]> {
    const params = new HttpParams()
      .set('period', period)
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http
      .get<ApiResponse<PageResponse<BestSellingProduct> | BestSellingProduct[]> | PageResponse<BestSellingProduct> | BestSellingProduct[]>(`${this.apiUrl}/best-selling`, { params })
      .pipe(
        map(unwrapApiResponse),
        map((response: PageResponse<BestSellingProduct> | BestSellingProduct[]) =>
          Array.isArray(response) ? response : response.content || []
        )
      );
  }

  update(id: number, product: Product, userId: number): Observable<Product> {
    const params = new HttpParams().set('userId', userId.toString());
    return this.http
      .put<ApiResponse<Product> | Product>(`${this.apiUrl}/${id}`, product, { params })
      .pipe(map(unwrapApiResponse));
  }

  updateStaffInfo(id: number, product: Pick<Product, 'product_name' | 'price' | 'tags' | 'image_url'>): Observable<void> {
    return this.http
      .patch<ApiResponse<void> | void>(`${this.apiUrl}/${id}/staff-info`, product)
      .pipe(map(unwrapApiResponse));
  }

  addVariant(productId: number, variant: ProductVariant, userId: number): Observable<Product> {
    const params = new HttpParams().set('userId', userId.toString());
    return this.http
      .post<ApiResponse<Product> | Product>(`${this.apiUrl}/${productId}/variants`, variant, { params })
      .pipe(map(unwrapApiResponse));
  }

  restockVariant(variantId: number, request: StockImportRequest, userId: number): Observable<ProductVariant> {
    const params = new HttpParams().set('userId', userId.toString());
    return this.http
      .post<ApiResponse<ProductVariant> | ProductVariant>(`${this.apiUrl}/variants/${variantId}/restock`, request, { params })
      .pipe(map(unwrapApiResponse));
  }

  getById(id: number): Observable<Product> {
    return this.http
      .get<ApiResponse<Product> | Product>(`${this.apiUrl}/${id}`)
      .pipe(map(unwrapApiResponse));
  }
  delete(id: number, userId: number): Observable<string> {
    const params = new HttpParams().set('userId', userId.toString());
    return this.http.delete<string>(`${this.apiUrl}/${id}`, { params, responseType: 'text' as 'json' });
  }
}
