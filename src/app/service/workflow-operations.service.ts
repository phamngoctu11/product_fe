import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import {
  WorkflowDlqIncident,
  WorkflowOperationsSummary,
  WorkflowOutboxIncident,
} from '../model/workflow-operations.model';

@Injectable({
  providedIn: 'root',
})
export class WorkflowOperationsService {
  private readonly apiUrl = `${environment.apiUrl}/manager/workflow-operations`;

  constructor(private http: HttpClient) {}

  getSummary(): Observable<WorkflowOperationsSummary> {
    return this.http
      .get<ApiResponse<WorkflowOperationsSummary> | WorkflowOperationsSummary>(
        `${this.apiUrl}/summary`,
      )
      .pipe(map(unwrapApiResponse));
  }

  getOutboxIncidents(limit: number = 50): Observable<WorkflowOutboxIncident[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http
      .get<ApiResponse<WorkflowOutboxIncident[]> | WorkflowOutboxIncident[]>(
        `${this.apiUrl}/outbox/incidents`,
        { params },
      )
      .pipe(map(unwrapApiResponse));
  }

  requeueOutbox(eventId: string): Observable<boolean> {
    return this.http
      .post<ApiResponse<boolean> | boolean>(
        `${this.apiUrl}/outbox/${encodeURIComponent(eventId)}/requeue`,
        {},
      )
      .pipe(map(unwrapApiResponse));
  }

  getDlqCount(): Observable<number> {
    return this.http
      .get<ApiResponse<number> | number>(`${this.apiUrl}/dlq/count`)
      .pipe(map(unwrapApiResponse));
  }

  getDlqIncidents(limit: number = 50): Observable<WorkflowDlqIncident[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http
      .get<ApiResponse<WorkflowDlqIncident[]> | WorkflowDlqIncident[]>(
        `${this.apiUrl}/dlq/incidents`,
        { params },
      )
      .pipe(map(unwrapApiResponse));
  }

  replayDlq(recordId: string): Observable<boolean> {
    return this.http
      .post<ApiResponse<boolean> | boolean>(
        `${this.apiUrl}/dlq/${encodeURIComponent(recordId)}/replay`,
        {},
      )
      .pipe(map(unwrapApiResponse));
  }
}

