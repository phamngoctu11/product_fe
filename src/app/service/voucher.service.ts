import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CartVoucherOptions, VoucherCartOption, VoucherTemplate, VoucherTemplateRequest, UserVoucher } from '../model/voucher.model';
import { ApiResponse, unwrapApiResponse } from '../model/api-response.model';
import { environment } from '../../environments/environment';
import { GuestSessionService } from './guest-session.service';

@Injectable({
  providedIn: 'root',
})
export class VoucherService {
  private apiUrl = `${environment.apiUrl}/vouchers`;

  constructor(
    private http: HttpClient,
    private guestSessionService: GuestSessionService,
  ) {}

  // Lấy danh sách mã đang phát hành
  getTemplates(): Observable<VoucherTemplate[]> {
    return this.http
      .get<ApiResponse<VoucherTemplate[]> | VoucherTemplate[]>(`${this.apiUrl}/templates`)
      .pipe(map(unwrapApiResponse));
  }

  getManagementTemplates(): Observable<VoucherTemplate[]> {
    return this.http
      .get<ApiResponse<VoucherTemplate[]> | VoucherTemplate[]>(`${this.apiUrl}/admin/templates`)
      .pipe(map(unwrapApiResponse));
  }

  // Lấy ví Voucher của người dùng
  getMyWallet(): Observable<UserVoucher[]> {
    return this.http
      .get<ApiResponse<UserVoucher[]> | UserVoucher[]>(`${this.apiUrl}/me/wallet`)
      .pipe(map(unwrapApiResponse));
  }

  // Thực hiện đổi điểm lấy mã
  redeemVoucher(templateId: number): Observable<UserVoucher> {
    const params = new HttpParams()
      .set('templateId', templateId.toString());

    return this.http
      .post<ApiResponse<UserVoucher> | UserVoucher>(`${this.apiUrl}/me/redeem`, null, { params })
      .pipe(map(unwrapApiResponse));
  }

  getCartOptions(subtotal: number): Observable<CartVoucherOptions> {
    const params = new HttpParams().set('subtotal', Math.max(0, subtotal).toString());
    return this.http
      .get<ApiResponse<CartVoucherOptions> | CartVoucherOptions>(`${this.apiUrl}/me/cart-options`, { params })
      .pipe(map(unwrapApiResponse));
  }

  getGuestVouchers(subtotal: number): Observable<VoucherCartOption[]> {
    const params = new HttpParams().set('subtotal', Math.max(0, subtotal).toString());
    const headers = new HttpHeaders()
      .set('X-Guest-Session-Id', this.guestSessionService.getOrCreateSessionId());
    return this.http
      .get<ApiResponse<VoucherCartOption[]> | VoucherCartOption[]>(`${this.apiUrl}/guest`, { params, headers })
      .pipe(map(unwrapApiResponse));
  }

  createCampaign(template: VoucherTemplateRequest): Observable<VoucherTemplate> {
    return this.http
      .post<ApiResponse<VoucherTemplate> | VoucherTemplate>(`${this.apiUrl}/admin/campaigns`, template)
      .pipe(map(unwrapApiResponse));
  }
}
