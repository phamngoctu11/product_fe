import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoginRequest, LoginResponse } from '../model/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';
  private userUrl = 'http://localhost:8080/api/users'; // Thêm URL gọi sang UserController

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => {
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('user_id', res.user_id.toString());
        localStorage.setItem('username', res.username);
      }),
    );
  }

  // THÊM HÀM ĐĂNG KÝ
  register(userData: any): Observable<any> {
    // Gọi đến API POST /api/users để khởi chạy quy trình Camunda
    return this.http.post<any>(this.userUrl, userData);
  }

  logout() {
    localStorage.clear();
  }

  getUserId(): number | null {
    const id = localStorage.getItem('user_id');
    return id ? parseInt(id, 10) : null;
  }

  getCurrentUser() {}
}
