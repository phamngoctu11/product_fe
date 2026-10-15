import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import {
  OrderItemProductionDTO,
  ProductionCheckpointDTO,
  ReviewProductionCheckpointRequest,
  ReviewProductionCheckpointResultDTO,
  SubmitProductionCheckpointRequest,
} from '../model/production-checkpoint.model';

@Injectable({
  providedIn: 'root',
})
export class ProductionCheckpointService {
  private readonly baseUrl = `${environment.apiUrl}/orders`;
  private readonly guestUrl = `${environment.apiUrl}/guest/orders`;
  private readonly uploadUrl = `${environment.apiUrl}/upload/image`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Upload một ảnh lên hệ thống và nhận về HTTPS URL.
   */
  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<ApiResponse<{ url: string }> | { url: string }>(this.uploadUrl, formData)
      .pipe(
        map(unwrapApiResponse),
        map((res) => (typeof res === 'object' && res && 'url' in res ? res.url : (res as any))),
      );
  }

  /**
   * Upload đồng thời nhiều ảnh và nhận về danh sách HTTPS URL.
   */
  uploadImages(files: File[]): Observable<string[]> {
    if (!files || files.length === 0) return of([]);
    return forkJoin(files.map((file) => this.uploadImage(file)));
  }

  /**
   * STAFF nộp checkpoint (INITIAL_SHAPE hoặc FINAL_PRODUCT) cho một OrderItem.
   * Header bắt buộc: Idempotency-Key
   */
  submitCheckpoint(
    orderId: number,
    orderItemId: number,
    request: SubmitProductionCheckpointRequest,
    idempotencyKey: string,
  ): Observable<ProductionCheckpointDTO> {
    const headers = new HttpHeaders({
      'Idempotency-Key': idempotencyKey,
    });
    return this.http
      .post<ApiResponse<ProductionCheckpointDTO> | ProductionCheckpointDTO>(
        `${this.baseUrl}/staff/${orderId}/items/${orderItemId}/checkpoints`,
        request,
        { headers },
      )
      .pipe(map(unwrapApiResponse));
  }

  /**
   * MANAGER KCS review checkpoint FINAL_PRODUCT.
   * Header bắt buộc: Idempotency-Key
   */
  reviewCheckpoint(
    orderId: number,
    checkpointId: number,
    request: ReviewProductionCheckpointRequest,
    idempotencyKey: string,
  ): Observable<ReviewProductionCheckpointResultDTO> {
    const headers = new HttpHeaders({
      'Idempotency-Key': idempotencyKey,
    });
    return this.http
      .post<ApiResponse<ReviewProductionCheckpointResultDTO> | ReviewProductionCheckpointResultDTO>(
        `${this.baseUrl}/manager/${orderId}/checkpoints/${checkpointId}/review`,
        request,
        { headers },
      )
      .pipe(map(unwrapApiResponse));
  }

  /**
   * Đọc tiến độ sản xuất và checkpoint (USER, STAFF, MANAGER).
   */
  getProgress(orderId: number): Observable<OrderItemProductionDTO[]> {
    return this.http
      .get<ApiResponse<OrderItemProductionDTO[]> | OrderItemProductionDTO[]>(
        `${this.baseUrl}/${orderId}/checkpoints`,
      )
      .pipe(map(unwrapApiResponse));
  }

  /**
   * Đọc tiến độ sản xuất cho khách vãng lai (Guest).
   */
  getGuestProgress(orderId: number, token: string): Observable<OrderItemProductionDTO[]> {
    const params = new HttpParams().set('token', token);
    return this.http
      .get<ApiResponse<OrderItemProductionDTO[]> | OrderItemProductionDTO[]>(
        `${this.guestUrl}/${orderId}/checkpoints`,
        { params },
      )
      .pipe(map(unwrapApiResponse));
  }

  /**
   * Sinh UUID ngẫu nhiên cho Idempotency-Key
   */
  generateIdempotencyKey(prefix?: string, entityId?: number | string): string {
    let base = '';
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      base = crypto.randomUUID();
    } else {
      base = 'idemp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
    }
    return prefix ? `${prefix}-${entityId ?? ''}-${base}` : base;
  }
}
