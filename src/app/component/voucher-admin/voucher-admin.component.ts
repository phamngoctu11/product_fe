import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { getApiErrorMessage } from '../../model/api-response.model';
import { VoucherTemplate, VoucherTemplateRequest } from '../../model/voucher.model';
import { VoucherService } from '../../service/voucher.service';

@Component({
  selector: 'app-voucher-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './voucher-admin.component.html',
})
export class VoucherAdminComponent implements OnInit {
  templates: VoucherTemplate[] = [];
  isLoadingTemplates = false;
  isSaving = false;

  campaign: VoucherTemplateRequest = this.createEmptyCampaign();

  constructor(private voucherService: VoucherService) {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.isLoadingTemplates = true;
    this.voucherService.getTemplates().subscribe({
      next: (templates) => {
        this.templates = templates || [];
        this.isLoadingTemplates = false;
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách voucher template:', err);
        this.isLoadingTemplates = false;
      },
    });
  }

  saveCampaign(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    if (!this.isFutureDate(this.campaign.expiryDate)) {
      alert('Ngày hết hạn phải nằm trong tương lai.');
      return;
    }

    if (this.campaign.discountPercent <= 0 && this.campaign.maxDiscountAmount <= 0) {
      alert('Voucher cần có phần trăm giảm hoặc số tiền giảm tối đa lớn hơn 0.');
      return;
    }

    this.isSaving = true;
    this.voucherService.createCampaign(this.buildPayload()).subscribe({
      next: () => {
        alert('Tạo voucher campaign thành công!');
        this.campaign = this.createEmptyCampaign();
        form.resetForm(this.campaign);
        this.loadTemplates();
        this.isSaving = false;
      },
      error: (err) => {
        alert('Không thể tạo voucher campaign: ' + getApiErrorMessage(err, 'Vui lòng kiểm tra lại dữ liệu.'));
        this.isSaving = false;
      },
    });
  }

  createEmptyCampaign(): VoucherTemplateRequest {
    return {
      code: '',
      name: '',
      description: '',
      pointCost: 0,
      minOrderValue: 0,
      discountPercent: 0,
      maxDiscountAmount: 0,
      quantity: 1,
      expiryDate: this.getDefaultExpiryDate(),
      active: true,
    };
  }

  buildPayload(): VoucherTemplateRequest {
    return {
      code: this.campaign.code.trim().toUpperCase(),
      name: this.campaign.name.trim(),
      description: this.campaign.description?.trim() || '',
      pointCost: Number(this.campaign.pointCost || 0),
      minOrderValue: Number(this.campaign.minOrderValue || 0),
      discountPercent: Number(this.campaign.discountPercent || 0),
      maxDiscountAmount: Number(this.campaign.maxDiscountAmount || 0),
      quantity: Number(this.campaign.quantity || 0),
      expiryDate: this.campaign.expiryDate,
      active: !!this.campaign.active,
    };
  }

  getDefaultExpiryDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    date.setMinutes(0, 0, 0);
    return this.toDateTimeLocalValue(date);
  }

  getMinExpiryDate(): string {
    const date = new Date();
    date.setMinutes(date.getMinutes() + 1, 0, 0);
    return this.toDateTimeLocalValue(date);
  }

  isFutureDate(value: string): boolean {
    return !!value && new Date(value).getTime() > Date.now();
  }

  private toDateTimeLocalValue(date: Date): string {
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
