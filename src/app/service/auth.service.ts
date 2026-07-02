import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { LoginRequest, LoginResponse } from '../model/user.model';
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
          localStorage.setItem('user_id', response.user_id.toString());
          localStorage.setItem('username', response.username);
        }),
      );
  }

  register(userData: unknown): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown> | unknown>(this.userUrl, userData)
      .pipe(map(unwrapApiResponse));
  }

  logout(): void {
    clearAuthStorage();
  }

  getUserId(): string | null {
    const id = localStorage.getItem('user_id');
    return id ? id : null;
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
    return localStorage.getItem('username') ?? this.getDecodedToken()?.preferred_username ?? null;
  }
}
