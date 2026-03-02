import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserCreDTO, UserResListDTO } from '../model/user.model';
import { PageResponse } from '../model/page-response.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api/users';
  constructor(private http: HttpClient) {}

 getAll(page: number = 0, size: number = 10): Observable<PageResponse<UserResListDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PageResponse<UserResListDTO>>(this.apiUrl, { params });
  }
  getById(id: number): Observable<UserResListDTO> {
    return this.http.get<UserResListDTO>(`${this.apiUrl}/${id}`);
  }

  create(user: UserCreDTO): Observable<UserResListDTO> {
    return this.http.post<UserResListDTO>(this.apiUrl, user);
  }

  update(id: number, user: UserCreDTO): Observable<UserResListDTO> {
    return this.http.put<UserResListDTO>(`${this.apiUrl}/${id}`, user);
  }

  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.apiUrl}/${id}`, { responseType: 'text' as 'json' });
  }
}
