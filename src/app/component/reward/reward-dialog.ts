import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { VoucherTemplate, UserVoucher } from '../../model/voucher.model';
import { UserService } from '../../service/user.service';
import { VoucherService } from '../../service/voucher.service';

@Component({
  selector: 'app-reward-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './reward-dialog.html'})
export class RewardDialogComponent implements OnInit {
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
      alert('Rất tiếc! Mã giảm giá này đã được đổi hết lượt.');
      return;
    }

    // 2. Kiểm tra điểm uy tín khả dụng
    const available = this.getAvailablePoints();
    if (available < template.pointCost) {
      const missingPoints = template.pointCost - available;
      alert(`Đổi thất bại!\n\nQuỹ điểm khả dụng của bạn hiện tại là ${available} điểm.\nBạn cần tích lũy thêm ${missingPoints} điểm nữa để đổi mã này (Hệ thống luôn yêu cầu giữ lại 40 điểm an toàn).`);
      return;
    }

    // 3. Nếu vượt qua hết các kiểm tra thì hỏi xác nhận
    if (confirm(`Bạn có chắc chắn muốn dùng ${template.pointCost} điểm để đổi mã ${template.name}?`)) {
      this.voucherService.redeemVoucher(this.userId, template.id).subscribe({
        next: (res) => {
          alert(res);
          this.loadData(); // Tải lại dữ liệu ngay lập tức
        },
        error: (err) => alert(err.error || 'Lỗi không thể đổi mã')
      });
    }
  }
}
