import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';// Import từ file riêng
import { ChatMessage, ChatUser } from '../model/chat.model';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { ConsultationRequest } from '../model/consultation.model';

export interface ConsultationChatContext {
  consultation: ConsultationRequest;
  productData?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  // Tự động nối 'http://localhost:8080/api' với '/chat'
  private apiUrl = `${environment.apiUrl}/chat`;
  private productQuerySource = new Subject<any>();
  public productQuery$ = this.productQuerySource.asObservable();
  private consultationSource = new Subject<ConsultationChatContext>();
  public consultation$ = this.consultationSource.asObservable();

  constructor(private http: HttpClient) {}

  // 🚨 THÊM HÀM NÀY: Ai muốn gửi Thẻ sản phẩm thì gọi hàm này
  triggerProductQuery(productData: any) {
    this.productQuerySource.next(productData);
  }

  openConsultation(consultation: ConsultationRequest, productData?: any) {
    this.consultationSource.next({ consultation, productData });
  }


  getChatHistory(userId: string): Observable<ChatMessage[]> {
    return this.http
      .get<ApiResponse<ChatMessage[]> | ChatMessage[]>(`${this.apiUrl}/${userId}`)
      .pipe(map(unwrapApiResponse));
  }

  getConsultationChatHistory(requestId: number, productId?: number | null): Observable<ChatMessage[]> {
    let params = new HttpParams();
    if (productId) {
      params = params.set('productId', productId.toString());
    }
    return this.http
      .get<ApiResponse<ChatMessage[]> | ChatMessage[]>(`${this.apiUrl}/consultations/${requestId}`, { params })
      .pipe(map(unwrapApiResponse));
  }

  getChattedUsers(): Observable<ChatUser[]> {
    return this.http
      .get<ApiResponse<ChatUser[]> | ChatUser[]>(`${this.apiUrl}/users`)
      .pipe(map(unwrapApiResponse));
  }
}
