import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VoucherTemplate, UserVoucher } from '../model/voucher.model';

@Injectable({
  providedIn: 'root',
})
export class VoucherService {
  private apiUrl = 'http://localhost:8080/api/vouchers';

  constructor(private http: HttpClient) {}

  // Lấy danh sách mã đang phát hành
  getTemplates(): Observable<VoucherTemplate[]> {
    return this.http.get<VoucherTemplate[]>(`${this.apiUrl}/templates`);
  }

  // Lấy ví Voucher của người dùng
  getMyWallet(userId: number): Observable<UserVoucher[]> {
    return this.http.get<UserVoucher[]>(`${this.apiUrl}/wallet/${userId}`);
  }

  // Thực hiện đổi điểm lấy mã
  redeemVoucher(userId: number, templateId: number): Observable<string> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('templateId', templateId.toString());

    return this.http.post(`${this.apiUrl}/redeem`, null, {
      params,
      responseType: 'text',
    });
  }
}
