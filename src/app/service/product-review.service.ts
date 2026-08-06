import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { PageResponse } from '../model/page-response.model';
import {
  ProductReview,
  ProductReviewRequest,
  ProductReviewSummary,
} from '../model/product-review.model';

@Injectable({
  providedIn: 'root',
})
export class ProductReviewService {
  private readonly apiUrl = `${environment.apiUrl}/product-reviews`;

  constructor(private readonly http: HttpClient) {}

  createForOrderItem(orderItemId: number, request: ProductReviewRequest): Observable<ProductReview> {
    return this.http
      .post<ApiResponse<ProductReview> | ProductReview>(
        `${this.apiUrl}/order-items/${orderItemId}`,
        request,
      )
      .pipe(map(unwrapApiResponse));
  }

  updateMyReview(reviewId: number, request: ProductReviewRequest): Observable<ProductReview> {
    return this.http
      .put<ApiResponse<ProductReview> | ProductReview>(`${this.apiUrl}/${reviewId}`, request)
      .pipe(map(unwrapApiResponse));
  }

  getProductReviews(
    productId: number,
    page: number = 0,
    size: number = 20,
  ): Observable<PageResponse<ProductReview>> {
    const params = this.pageParams(page, size);
    return this.http
      .get<ApiResponse<PageResponse<ProductReview>> | PageResponse<ProductReview>>(
        `${this.apiUrl}/products/${productId}`,
        { params },
      )
      .pipe(map(unwrapApiResponse));
  }

  getProductSummary(productId: number): Observable<ProductReviewSummary> {
    return this.http
      .get<ApiResponse<ProductReviewSummary> | ProductReviewSummary>(
        `${this.apiUrl}/products/${productId}/summary`,
      )
      .pipe(map(unwrapApiResponse));
  }

  getVariantReviews(
    variantId: number,
    page: number = 0,
    size: number = 20,
  ): Observable<PageResponse<ProductReview>> {
    const params = this.pageParams(page, size);
    return this.http
      .get<ApiResponse<PageResponse<ProductReview>> | PageResponse<ProductReview>>(
        `${this.apiUrl}/variants/${variantId}`,
        { params },
      )
      .pipe(map(unwrapApiResponse));
  }

  getVisibleVariantReviews(
    variantId: number,
    page: number = 0,
    size: number = 20,
  ): Observable<PageResponse<ProductReview>> {
    const params = this.pageParams(page, size);
    return this.http
      .get<ApiResponse<PageResponse<ProductReview>> | PageResponse<ProductReview>>(
        `${this.apiUrl}/variants/${variantId}/public`,
        { params },
      )
      .pipe(map(unwrapApiResponse));
  }

  getVariantSummary(variantId: number): Observable<ProductReviewSummary> {
    return this.http
      .get<ApiResponse<ProductReviewSummary> | ProductReviewSummary>(
        `${this.apiUrl}/variants/${variantId}/summary`,
      )
      .pipe(map(unwrapApiResponse));
  }

  hideReview(reviewId: number, reason: string = ''): Observable<ProductReview> {
    const params = reason.trim() ? new HttpParams().set('reason', reason.trim()) : undefined;
    return this.http
      .put<ApiResponse<ProductReview> | ProductReview>(
        `${this.apiUrl}/${reviewId}/hide`,
        null,
        { params },
      )
      .pipe(map(unwrapApiResponse));
  }

  restoreReview(reviewId: number): Observable<ProductReview> {
    return this.http
      .put<ApiResponse<ProductReview> | ProductReview>(`${this.apiUrl}/${reviewId}/restore`, null)
      .pipe(map(unwrapApiResponse));
  }

  private pageParams(page: number, size: number): HttpParams {
    return new HttpParams()
      .set('page', Math.max(0, page).toString())
      .set('size', Math.max(1, size).toString());
  }
}
