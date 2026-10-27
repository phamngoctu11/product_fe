import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BestSellingProduct, Product, PageResponse, ProductVariant, ProductAvailabilityStatus, ProductSearchSuggestions } from '../model/product.model';
import { ProductTypeField, ProductTypeOption } from '../model/custom-request.model';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { environment } from '../../environments/environment';

export interface ProductQueryParams {
  keyword?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  productTypeIds?: number[];
}
export interface SaveProductType { code: string; name: string; description?: string; fields: ProductTypeField[]; active: boolean; }

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

  getAll(page: number = 0, size: number = 10, filters: ProductQueryParams = {}): Observable<PageResponse<Product>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    const keyword = filters.keyword?.trim();

    if (keyword) {
      params = params.set('keyword', keyword);
    }
    if (filters.minPrice !== null && filters.minPrice !== undefined && filters.minPrice >= 0) {
      params = params.set('minPrice', filters.minPrice.toString());
    }
    if (filters.maxPrice !== null && filters.maxPrice !== undefined && filters.maxPrice > 0) {
      params = params.set('maxPrice', filters.maxPrice.toString());
    }
    for (const productTypeId of filters.productTypeIds || []) {
      if (Number.isInteger(productTypeId) && productTypeId > 0) {
        params = params.append('productTypeIds', String(productTypeId));
      }
    }

    return this.http
      .get<ApiResponse<PageResponse<Product>> | PageResponse<Product>>(this.apiUrl, { params })
      .pipe(map(unwrapApiResponse));
  }

  getSearchSuggestions(keyword: string, limit = 3): Observable<ProductSearchSuggestions> {
    const params = new HttpParams()
      .set('keyword', keyword.trim())
      .set('limit', String(Math.min(Math.max(limit, 1), 3)));
    return this.http
      .get<ApiResponse<ProductSearchSuggestions> | ProductSearchSuggestions>(`${this.apiUrl}/search/suggestions`, { params })
      .pipe(map(unwrapApiResponse));
  }

  getProductTypes(management = false): Observable<ProductTypeOption[]> {
    const path = management ? '/product-types/management' : '/product-types';
    return this.http.get<ApiResponse<ProductTypeOption[]>>(`${environment.apiUrl}${path}`).pipe(map(unwrapApiResponse));
  }

  saveProductType(type: SaveProductType, id?: number): Observable<ProductTypeOption> {
    const request = id ? this.http.put<ApiResponse<ProductTypeOption>>(`${environment.apiUrl}/product-types/${id}`, type)
      : this.http.post<ApiResponse<ProductTypeOption>>(`${environment.apiUrl}/product-types`, type);
    return request.pipe(map(unwrapApiResponse));
  }

  deactivateProductType(id: number): Observable<ProductTypeOption> {
    return this.http.delete<ApiResponse<ProductTypeOption>>(`${environment.apiUrl}/product-types/${id}`)
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

  update(id: number, product: Product): Observable<Product> {
    return this.http
      .put<ApiResponse<Product> | Product>(`${this.apiUrl}/${id}`, product)
      .pipe(map(unwrapApiResponse));
  }

  addVariant(productId: number, variant: ProductVariant): Observable<Product> {
    return this.http
      .post<ApiResponse<Product> | Product>(`${this.apiUrl}/${productId}/variants`, variant)
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
