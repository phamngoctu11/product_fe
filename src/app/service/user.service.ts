import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserCreDTO, UserResListDTO } from '../model/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api/users';
  constructor(private http: HttpClient) {}

  getAll(): Observable<UserResListDTO[]> {
    return this.http.get<UserResListDTO[]>(this.apiUrl);
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
