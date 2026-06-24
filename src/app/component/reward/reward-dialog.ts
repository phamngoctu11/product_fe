import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject as injectActionDialog } from '@angular/core';
import { ActionDialogService } from '../../service/action-dialog.service';
import { inject as injectToast } from '@angular/core';
import { ToastService } from '../../service/toast.service';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { VoucherTemplate, UserVoucher } from '../../model/voucher.model';
import { UserService } from '../../service/user.service';
import { VoucherService } from '../../service/voucher.service';
import { getApiErrorMessage } from '../../model/api-response.model';

@Component({
  selector: 'app-reward-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './reward-dialog.html',
  styleUrls: ['../../app.css', './reward-dialog.css'],
})
export class RewardDialogComponent implements OnInit {
  private readonly actionDialog = injectActionDialog(ActionDialogService);
  private readonly toast = injectToast(ToastService);
  templates: VoucherTemplate[] = [];
  myWallet: UserVoucher[] = [];
  currentReputation: number = 0;

  constructor(
    @Inject(MAT_DIALOG_DATA) public userId: number,
    private voucherService: VoucherService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.userService.getById(this.userId).subscribe(user => {
      this.currentReputation = user.reputation;
    });

    this.voucherService.getTemplates().subscribe(data => this.templates = data);
    this.voucherService.getMyWallet(this.userId).subscribe(data => this.myWallet = data);
  }
isExpiringSoon(dateString: string): boolean {
    if (!dateString) return false;
    const expDate = new Date(dateString);
    const now = new Date();

    // Tính khoảng cách thời gian bằng milliseconds
    const diffTime = expDate.getTime() - now.getTime();

    // Đổi ra ngày
    const diffDays = diffTime / (1000 * 3600 * 24);

    // Nếu còn sống lớn hơn 0 và nhỏ hơn hoặc bằng 2 ngày -> Bật cảnh báo
    return diffDays > 0 && diffDays <= 2;
  }
  getAvailablePoints(): number {
    return Math.max(0, this.currentReputation - 40);
  }

  redeem(template: VoucherTemplate) {
    // 1. Kiểm tra nếu mã đã bị đổi hết
    if (template.quantity <= 0) {
      this.toast.notify('Rất tiếc! Mã giảm giá này đã được đổi hết lượt.');
      return;
    }

    // 2. Kiểm tra điểm uy tín khả dụng
    const available = this.getAvailablePoints();
    if (available < template.pointCost) {
      const missingPoints = template.pointCost - available;
      this.toast.notify(`Đổi thất bại!\n\nQuỹ điểm khả dụng của bạn hiện tại là ${available} điểm.\nBạn cần tích lũy thêm ${missingPoints} điểm nữa để đổi mã này (Hệ thống luôn yêu cầu giữ lại 40 điểm an toàn).`);
      return;
    }

    // 3. Nếu vượt qua hết các kiểm tra thì hỏi xác nhận
    this.actionDialog.confirm({
      title: 'Xác nhận đổi voucher',
      message: `Bạn muốn dùng ${template.pointCost} điểm để đổi mã ${template.name}?`,
      confirmText: 'Đổi voucher',
      tone: 'warning',
      icon: 'bi-gift-fill',
      details: [
        { label: 'Điểm sử dụng', value: `${template.pointCost} điểm` },
        { label: 'Điểm khả dụng', value: `${available} điểm` },
      ],
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.voucherService.redeemVoucher(this.userId, template.id).subscribe({
        next: (res) => {
          this.toast.notify(res);
          this.loadData(); // Tải lại dữ liệu ngay lập tức
        },
        error: (err) => this.toast.notify(getApiErrorMessage(err, 'Lỗi không thể đổi mã'))
      });
    });
  }
}
