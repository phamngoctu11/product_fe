import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../model/api-response.model';
import { PageResponse } from '../model/page-response.model';
import {
  CreateCustomRequest,
  CustomRequestDTO,
  CustomRequestStatus,
  CustomRequestSubmissionDTO,
  SubmitCustomRequest,
  UpdateCustomRequest,
} from '../model/custom-request.model';

@Injectable({ providedIn: 'root' })
export class CustomRequestService {
  private readonly apiUrl = `${environment.apiUrl}/custom-requests`;

  constructor(private readonly http: HttpClient) {}

  /** Sinh khóa idempotency mới. Caller giữ lại khóa để retry cùng một thao tác. */
  newIdempotencyKey(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  create(request: CreateCustomRequest, idempotencyKey?: string): Observable<CustomRequestDTO> {
    const headers = idempotencyKey ? new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) : undefined;
    return this.http
      .post<ApiResponse<CustomRequestDTO>>(this.apiUrl, request, { headers })
      .pipe(map((res) => res.data));
  }

  list(status?: CustomRequestStatus, page = 0, size = 20): Observable<PageResponse<CustomRequestDTO>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'updatedAt,desc');
    if (status) params = params.set('status', status);
    return this.http
      .get<ApiResponse<PageResponse<CustomRequestDTO>>>(this.apiUrl, { params })
      .pipe(map((res) => res.data));
  }

  get(id: number): Observable<CustomRequestDTO> {
    return this.http.get<ApiResponse<CustomRequestDTO>>(`${this.apiUrl}/${id}`).pipe(map((res) => res.data));
  }

  update(id: number, request: UpdateCustomRequest): Observable<CustomRequestDTO> {
    return this.http
      .put<ApiResponse<CustomRequestDTO>>(`${this.apiUrl}/${id}`, request)
      .pipe(map((res) => res.data));
  }

  delete(id: number, expectedVersion: number, idempotencyKey: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      params: new HttpParams().set('expectedVersion', expectedVersion),
      headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
    });
  }

  submit(id: number, request: SubmitCustomRequest, idempotencyKey: string): Observable<CustomRequestSubmissionDTO> {
    return this.http
      .post<ApiResponse<CustomRequestSubmissionDTO>>(`${this.apiUrl}/${id}/submit`, request, {
        headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
      })
      .pipe(map((res) => res.data));
  }
}
