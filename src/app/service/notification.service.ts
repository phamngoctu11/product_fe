import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { PageResponse } from '../model/page-response.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getCurrentUserHistory(page: number = 0, size: number = 10): Observable<PageResponse<any>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http
      .get<ApiResponse<PageResponse<any>> | PageResponse<any>>(`${this.apiUrl}/me`, { params })
      .pipe(map(unwrapApiResponse));
  }

  getAdminHistory(page: number = 0, size: number = 10): Observable<PageResponse<any>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http
      .get<ApiResponse<PageResponse<any>> | PageResponse<any>>(`${this.apiUrl}/admin`, { params })
      .pipe(map(unwrapApiResponse));
  }

  getMyHistory(useAdminFeed: boolean, page: number = 0, size: number = 10): Observable<PageResponse<any>> {
    return useAdminFeed ? this.getAdminHistory(page, size) : this.getCurrentUserHistory(page, size);
  }

  getCurrentUserUnreadCount(): Observable<number> {
    return this.http
      .get<ApiResponse<number> | number>(`${this.apiUrl}/me/unread-count`)
      .pipe(map(unwrapApiResponse));
  }

  getAdminUnreadCount(): Observable<number> {
    return this.http
      .get<ApiResponse<number> | number>(`${this.apiUrl}/admin/unread-count`)
      .pipe(map(unwrapApiResponse));
  }

  getMyUnreadCount(useAdminFeed: boolean): Observable<number> {
    return useAdminFeed ? this.getAdminUnreadCount() : this.getCurrentUserUnreadCount();
  }

  markCurrentUserAsRead(): Observable<void> {
    return this.http
      .put<ApiResponse<void> | void>(`${this.apiUrl}/read-all/me`, {})
      .pipe(map(unwrapApiResponse));
  }

  markAdminAsRead(): Observable<void> {
    return this.http
      .put<ApiResponse<void> | void>(`${this.apiUrl}/read-all/admin`, {})
      .pipe(map(unwrapApiResponse));
  }

  markMyHistoryAsRead(useAdminFeed: boolean): Observable<void> {
    return useAdminFeed ? this.markAdminAsRead() : this.markCurrentUserAsRead();
  }
}
