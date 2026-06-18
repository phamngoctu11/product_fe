import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { ConsultationCreateRequest, ConsultationRequest } from '../model/consultation.model';
import { PageResponse } from '../model/page-response.model';

@Injectable({
  providedIn: 'root',
})
export class ConsultationService {
  private readonly apiUrl = `${environment.apiUrl}/consultations`;

  constructor(private readonly http: HttpClient) {}

  createRequest(request: ConsultationCreateRequest): Observable<ConsultationRequest> {
    return this.http
      .post<ApiResponse<ConsultationRequest> | ConsultationRequest>(this.apiUrl, request)
      .pipe(map(unwrapApiResponse));
  }

  getWaiting(page = 0, size = 20): Observable<PageResponse<ConsultationRequest>> {
    return this.http
      .get<ApiResponse<PageResponse<ConsultationRequest>> | PageResponse<ConsultationRequest>>(
        `${this.apiUrl}/waiting`,
        { params: this.pageParams(page, size) },
      )
      .pipe(map(unwrapApiResponse));
  }

  getMyAssigned(page = 0, size = 20): Observable<PageResponse<ConsultationRequest>> {
    return this.http
      .get<ApiResponse<PageResponse<ConsultationRequest>> | PageResponse<ConsultationRequest>>(
        `${this.apiUrl}/staff/me`,
        { params: this.pageParams(page, size) },
      )
      .pipe(map(unwrapApiResponse));
  }

  claim(requestId: number): Observable<ConsultationRequest> {
    return this.http
      .post<ApiResponse<ConsultationRequest> | ConsultationRequest>(
        `${this.apiUrl}/${requestId}/claim`,
        {},
      )
      .pipe(map(unwrapApiResponse));
  }

  assign(requestId: number, staffId: number): Observable<ConsultationRequest> {
    const params = new HttpParams().set('staffId', staffId.toString());
    return this.http
      .post<ApiResponse<ConsultationRequest> | ConsultationRequest>(
        `${this.apiUrl}/${requestId}/assign`,
        {},
        { params },
      )
      .pipe(map(unwrapApiResponse));
  }

  close(requestId: number): Observable<ConsultationRequest | unknown> {
    return this.http
      .post<ApiResponse<ConsultationRequest | unknown> | ConsultationRequest | unknown>(
        `${this.apiUrl}/${requestId}/close`,
        {},
      )
      .pipe(map(unwrapApiResponse));
  }

  private pageParams(page: number, size: number): HttpParams {
    return new HttpParams().set('page', page.toString()).set('size', size.toString());
  }
}
