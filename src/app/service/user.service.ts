import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserCreDTO, UserInforDTO, UserResListDTO } from '../model/user.model';
import { PageResponse } from '../model/page-response.model';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;
  constructor(private http: HttpClient) {}

  getAll(page: number = 0, size: number = 10): Observable<PageResponse<UserResListDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http
      .get<ApiResponse<PageResponse<UserResListDTO>> | PageResponse<UserResListDTO>>(this.apiUrl, { params })
      .pipe(map(unwrapApiResponse));
  }

  getById(id: string): Observable<UserInforDTO> {
    return this.http
      .get<ApiResponse<UserInforDTO> | UserInforDTO>(`${this.apiUrl}/${id}`)
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

  delete(id: string): Observable<string> {
    return this.http.delete<string>(`${this.apiUrl}/${id}`, { responseType: 'text' as 'json' });
  }
}
