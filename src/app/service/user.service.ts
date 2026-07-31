import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ReputationHistory, UserCreDTO, UserInforDTO, UserProfileUpdateDTO, UserResListDTO } from '../model/user.model';
import { PageResponse } from '../model/page-response.model';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;
  private readonly currentUserSubject = new BehaviorSubject<UserInforDTO | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  getAll(page: number = 0, size: number = 10, roles: string[] = []): Observable<PageResponse<UserResListDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    roles.forEach((role) => params = params.append('roles', role));

    return this.http
      .get<ApiResponse<PageResponse<UserResListDTO>> | PageResponse<UserResListDTO>>(this.apiUrl, { params })
      .pipe(map(unwrapApiResponse));
  }

  getById(id: string): Observable<UserInforDTO> {
    return this.http
      .get<ApiResponse<UserInforDTO> | UserInforDTO>(`${this.apiUrl}/${id}`)
      .pipe(map(unwrapApiResponse));
  }

  getInfor(): Observable<UserInforDTO> {
    return this.http
      .get<ApiResponse<UserInforDTO> | UserInforDTO>(`${this.apiUrl}/me`)
      .pipe(
        map(unwrapApiResponse),
        tap((user) => this.currentUserSubject.next(user)),
      );
  }

  getMe(): Observable<UserInforDTO> {
    return this.getInfor();
  }

  getMyReputationHistory(page: number = 0, size: number = 20): Observable<PageResponse<ReputationHistory>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http
      .get<ApiResponse<PageResponse<ReputationHistory>> | PageResponse<ReputationHistory>>(`${this.apiUrl}/me/reputation-history`, { params })
      .pipe(map(unwrapApiResponse));
  }

  create(user: UserCreDTO): Observable<UserResListDTO> {
    return this.http
      .post<ApiResponse<UserResListDTO> | UserResListDTO>(this.apiUrl, user)
      .pipe(map(unwrapApiResponse));
  }

  update(id: string, user: UserCreDTO | UserInforDTO): Observable<UserResListDTO> {
    return this.http
      .put<ApiResponse<UserResListDTO> | UserResListDTO>(`${this.apiUrl}/${id}`, user)
      .pipe(map(unwrapApiResponse));
  }

  updateMe(user: UserProfileUpdateDTO): Observable<UserInforDTO> {
    return this.http
      .put<ApiResponse<UserInforDTO> | UserInforDTO>(`${this.apiUrl}/me`, user)
      .pipe(
        map(unwrapApiResponse),
        tap((updatedUser) => this.currentUserSubject.next(updatedUser)),
      );
  }

  clearCurrentUser(): void {
    this.currentUserSubject.next(null);
  }

  delete(id: string): Observable<string> {
    return this.http.delete<string>(`${this.apiUrl}/${id}`, { responseType: 'text' as 'json' });
  }
}
