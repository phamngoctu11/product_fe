import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  // Thay đổi URL nếu Backend của bạn chạy port khác
  private apiUrl = `${environment.apiUrl}/admin/dashboard/stats`;

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<any> {
    return this.http
      .get<ApiResponse<any> | any>(this.apiUrl)
      .pipe(map(unwrapApiResponse));
  }
}
