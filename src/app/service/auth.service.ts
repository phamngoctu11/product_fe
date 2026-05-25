import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { LoginRequest, LoginResponse } from '../model/user.model';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private userUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<ApiResponse<LoginResponse> | LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      map(unwrapApiResponse),
      tap((res) => {
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('user_id', res.user_id.toString());
        localStorage.setItem('username', res.username);
      }),
    );
  }

  register(userData: any): Observable<any> {
    return this.http
      .post<ApiResponse<any> | any>(this.userUrl, userData)
      .pipe(map(unwrapApiResponse));
  }

  logout() {
    localStorage.clear();
  }

  getUserId(): number | null {
    const id = localStorage.getItem('user_id');
    return id ? parseInt(id, 10) : null;
  }

  // =========================================================================
  // BỘ HÀM QUẢN LÝ QUYỀN (ROLE) VÀ TOKEN TOÀN CỤC (GLOBAL AUTHORIZATION)
  // =========================================================================

  // 1. Lấy Token từ LocalStorage
  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getDecodedToken(): any {
    const token = this.getToken();
    if (token) {
      try {
        const payloadBase64Url = token.split('.')[1];
        const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decodedJson = decodeURIComponent(atob(payloadBase64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(decodedJson);
      } catch (error) {
        console.error('Lỗi khi giải mã Token:', error);
        return null;
      }
    }
    return null;
  }

  // 3. Lấy Role của User hiện tại
  getUserRole(): string {
    const decodedToken = this.getDecodedToken();
    return decodedToken ? (decodedToken.role || '') : '';
  }

  // 4. Kiểm tra xem User có phải là Admin không
  isAdmin(): boolean {
    const role = this.getUserRole();
    return role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'ROLE_ADMIN' || role.toUpperCase() === 'MANAGER' || role.toUpperCase() === 'ROLE_MANAGER';
  }

  // 5. Kiểm tra xem User đã đăng nhập chưa
  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  getCurrentUser() {
    return this.getDecodedToken();
  }
  getCurrentUserName(){
    return localStorage.getItem('username');
  }
}
