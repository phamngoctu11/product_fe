import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  // Thay đổi URL nếu Backend của bạn chạy port khác
  private apiUrl = 'http://localhost:8080/api/admin/dashboard/stats';

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}
