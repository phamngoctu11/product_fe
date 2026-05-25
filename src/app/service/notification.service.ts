import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  // Lấy danh sách thông báo cũ từ Database
  getHistory(userId: number, isAdmin: boolean): Observable<any[]> {
    return this.http
      .get<ApiResponse<any[]> | any[]>(`${this.apiUrl}/${userId}?isAdmin=${isAdmin}`)
      .pipe(map(unwrapApiResponse));
  }

  // Đánh dấu tất cả là đã đọc
  markAllAsRead(userId: number, isAdmin: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/read-all/${userId}?isAdmin=${isAdmin}`, {}, { responseType: 'text' });
  }
}
