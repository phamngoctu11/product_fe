import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserResDTO, UserCreDTO } from '../model/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api/users';
  constructor(private http: HttpClient) {}

  getAll(): Observable<UserResDTO[]> {
    return this.http.get<UserResDTO[]>(this.apiUrl);
  }

  getById(id: number): Observable<UserResDTO> {
    return this.http.get<UserResDTO>(`${this.apiUrl}/${id}`);
  }

  create(user: UserCreDTO): Observable<UserResDTO> {
    return this.http.post<UserResDTO>(this.apiUrl, user);
  }

  update(id: number, user: UserCreDTO): Observable<UserResDTO> {
    return this.http.put<UserResDTO>(`${this.apiUrl}/${id}`, user);
  }

  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.apiUrl}/${id}`, { responseType: 'text' as 'json' });
  }
}
