import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { PageResponse } from '../model/page-response.model';
import {
  CommissionDetailQuery,
  CommissionQuery,
  StaffCommissionDetail,
  StaffCommissionSummary,
} from '../model/consultation-commission.model';

@Injectable({ providedIn: 'root' })
export class ConsultationCommissionService {
  private readonly apiUrl = `${environment.apiUrl}/consultation-commissions`;

  constructor(private readonly http: HttpClient) {}

  getMySummary(query: CommissionQuery = {}): Observable<StaffCommissionSummary> {
    return this.http
      .get<ApiResponse<StaffCommissionSummary> | StaffCommissionSummary>(
        `${this.apiUrl}/me/summary`,
        { params: this.buildParams(query) },
      )
      .pipe(map(unwrapApiResponse));
  }

  getMyDetails(query: CommissionDetailQuery = {}): Observable<PageResponse<StaffCommissionDetail>> {
    return this.http
      .get<ApiResponse<PageResponse<StaffCommissionDetail>> | PageResponse<StaffCommissionDetail>>(
        `${this.apiUrl}/me/details`,
        { params: this.buildParams(query) },
      )
      .pipe(map(unwrapApiResponse));
  }

  getStaffSummaries(query: CommissionDetailQuery = {}): Observable<PageResponse<StaffCommissionSummary>> {
    return this.http
      .get<ApiResponse<PageResponse<StaffCommissionSummary>> | PageResponse<StaffCommissionSummary>>(
        `${this.apiUrl}/staff`,
        { params: this.buildParams(query) },
      )
      .pipe(map(unwrapApiResponse));
  }

  getStaffSummary(staffId: number, query: CommissionQuery = {}): Observable<StaffCommissionSummary> {
    return this.http
      .get<ApiResponse<StaffCommissionSummary> | StaffCommissionSummary>(
        `${this.apiUrl}/staff/${staffId}/summary`,
        { params: this.buildParams(query) },
      )
      .pipe(map(unwrapApiResponse));
  }

  getStaffDetails(staffId: number, query: CommissionDetailQuery = {}): Observable<PageResponse<StaffCommissionDetail>> {
    return this.http
      .get<ApiResponse<PageResponse<StaffCommissionDetail>> | PageResponse<StaffCommissionDetail>>(
        `${this.apiUrl}/staff/${staffId}/details`,
        { params: this.buildParams(query) },
      )
      .pipe(map(unwrapApiResponse));
  }

  rebuildSummaries(query: CommissionQuery = {}): Observable<number> {
    return this.http
      .post<ApiResponse<number> | number>(
        `${this.apiUrl}/summaries/rebuild`,
        null,
        { params: this.buildParams(query) },
      )
      .pipe(map(unwrapApiResponse));
  }

  private buildParams(query: CommissionDetailQuery = {}): HttpParams {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && `${value}`.trim() !== '') {
        params = params.set(key, `${value}`);
      }
    });
    return params;
  }
}
