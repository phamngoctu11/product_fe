import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8080/api/notifications'; // Điều chỉnh port nếu khác

  constructor(private http: HttpClient) {}

  // Lấy danh sách thông báo cũ từ Database
  getHistory(userId: number, isAdmin: boolean): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${userId}?isAdmin=${isAdmin}`);
  }

  // Đánh dấu tất cả là đã đọc
  markAllAsRead(userId: number, isAdmin: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/read-all/${userId}?isAdmin=${isAdmin}`, {}, { responseType: 'text' });
  }
}
