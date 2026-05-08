import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';// Import từ file riêng
import { ChatMessage, ChatUser } from '../model/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  // Tự động nối 'http://localhost:8080/api' với '/chat'
  private apiUrl = `${environment.apiUrl}/chat`;

  constructor(private http: HttpClient) {}

  getChatHistory(userId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/${userId}`);
  }

  getChattedUsers(): Observable<ChatUser[]> {
    return this.http.get<ChatUser[]>(`${this.apiUrl}/users`);
  }
}
