import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { ForgotPasswordRequest, LoginRequest, LoginResponse, ResetPasswordRequest } from '../model/user.model';
import {
  clearAuthStorage,
  decodeJwtPayload,
  getApplicationRoles,
  isJwtExpired,
  KeycloakJwtPayload,
} from './auth-token.util';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly userUrl = `${environment.apiUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<ApiResponse<LoginResponse> | LoginResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        map(unwrapApiResponse),
        tap((response) => {
          localStorage.setItem('accessToken', response.accessToken);
        }),
      );
  }

  register(userData: unknown): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown> | unknown>(this.userUrl, userData)
      .pipe(map(unwrapApiResponse));
  }

  requestPasswordReset(request: ForgotPasswordRequest): Observable<void> {
    return this.http
      .post<ApiResponse<void> | void>(`${this.apiUrl}/forgot-password`, request)
      .pipe(map(unwrapApiResponse));
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http
      .post<ApiResponse<void> | void>(`${this.apiUrl}/reset-password`, request)
      .pipe(map(unwrapApiResponse));
  }

  logout(): void {
    clearAuthStorage();
  }

  getUserId(): string | null {
    const decodedToken = this.getDecodedToken();
    const sub = decodedToken ? (decodedToken['sub'] as string) : null;
    if (sub) {
      return sub;
    }
    return localStorage.getItem('user_id');
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getDecodedToken(): KeycloakJwtPayload | null {
    return decodeJwtPayload(this.getToken());
  }

  getUserRole(): string {
    return getApplicationRoles(this.getDecodedToken())[0] ?? '';
  }

  isAdmin(): boolean {
    const role = this.getUserRole();
    return role === 'ADMIN' || role === 'MANAGER';
  }

  isStaff(): boolean {
    return this.getUserRole() === 'STAFF';
  }

  isCustomer(): boolean {
    return this.getUserRole() === 'USER';
  }

  getHomeRoute(): string {
    return !this.isLoggedIn() || this.isCustomer() ? '/store/product' : '/management/product';
  }

  isLoggedIn(): boolean {
    if (isJwtExpired(this.getDecodedToken())) {
      clearAuthStorage();
      return false;
    }
    return true;
  }

  getCurrentUser(): KeycloakJwtPayload | null {
    return this.getDecodedToken();
  }

  getCurrentUserName(): string | null {
    const decodedToken = this.getDecodedToken();
    const preferredUsername = decodedToken ? (decodedToken['preferred_username'] as string) : null;
    if (preferredUsername) {
      return preferredUsername;
    }
    return localStorage.getItem('username');
  }
}
