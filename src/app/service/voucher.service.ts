import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { VoucherTemplate, VoucherTemplateRequest, UserVoucher } from '../model/voucher.model';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class VoucherService {
  private apiUrl = `${environment.apiUrl}/vouchers`;

  constructor(private http: HttpClient) {}

  // Lấy danh sách mã đang phát hành
  getTemplates(): Observable<VoucherTemplate[]> {
    return this.http
      .get<ApiResponse<VoucherTemplate[]> | VoucherTemplate[]>(`${this.apiUrl}/templates`)
      .pipe(map(unwrapApiResponse));
  }

  // Lấy ví Voucher của người dùng
  getMyWallet(): Observable<UserVoucher[]> {
    return this.http
      .get<ApiResponse<UserVoucher[]> | UserVoucher[]>(`${this.apiUrl}/me/wallet`)
      .pipe(map(unwrapApiResponse));
  }

  // Thực hiện đổi điểm lấy mã
  redeemVoucher(templateId: number): Observable<string> {
    const params = new HttpParams()
      .set('templateId', templateId.toString());

    return this.http.post(`${this.apiUrl}/me/redeem`, null, {
      params,
      responseType: 'text',
    });
  }

  createCampaign(template: VoucherTemplateRequest): Observable<VoucherTemplate> {
    return this.http
      .post<ApiResponse<VoucherTemplate> | VoucherTemplate>(`${this.apiUrl}/admin/campaigns`, template)
      .pipe(map(unwrapApiResponse));
  }
}
