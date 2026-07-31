import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { UserService } from '../../service/user.service';
import { AuthService } from '../../service/auth.service';
import { ReputationHistory, UserInforDTO } from '../../model/user.model';
import { Userdetail } from '../userdetail/userdetail';
import { PageHeaderComponent, ViewStateComponent } from '../shared';
import { APP_DIALOG_SIZE } from '../../config/dialog.config';

@Component({
  selector: 'app-myinfor',
  standalone: true,
  imports: [CommonModule, MatDialogModule, PageHeaderComponent, ViewStateComponent],
  templateUrl: './myinfor.html',
})
export class Myinfor implements OnInit {
  userInfo?: UserInforDTO;
  reputationHistory: ReputationHistory[] = [];
  isLoading = true;
  errorMessage = '';
  isLoadingReputationHistory = false;
  reputationHistoryError = '';

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMyInfo();
    this.loadReputationHistory();
  }

  get isCustomer(): boolean {
    return this.authService.isCustomer();
  }

  loadMyInfo() {
    this.userService.getInfor().subscribe({
      next: (res: any) => {
        this.userInfo = res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Lỗi khi tải thông tin cá nhân. Vui lòng thử lại sau.';
        this.isLoading = false;
      },
    });
  }

  loadReputationHistory(): void {
    this.isLoadingReputationHistory = true;
    this.reputationHistoryError = '';
    this.userService.getMyReputationHistory(0, 20).subscribe({
      next: (page) => {
        this.reputationHistory = page.content || [];
        this.isLoadingReputationHistory = false;
      },
      error: () => {
        this.reputationHistoryError = 'Không thể tải lịch sử điểm uy tín.';
        this.isLoadingReputationHistory = false;
      },
    });
  }

  formatDelta(delta: number): string {
    return delta > 0 ? `+${delta}` : `${delta}`;
  }

  getDeltaClass(delta: number): string {
    if (delta > 0) return 'text-success';
    if (delta < 0) return 'text-danger';
    return 'text-muted';
  }

  startEditing(): void {
    const dialogRef = this.dialog.open(Userdetail, {
      data: { id: null, action: 'self-edit' },
      ...APP_DIALOG_SIZE.profile,
    });
    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) this.loadMyInfo();
    });
  }

  openCart() {
    if (!this.authService.isCustomer()) return;
    // Lấy ID từ Token thay vì LocalStorage
    const userId = this.authService.getUserId();

    if (userId) {
      // Ép kiểu nếu hệ thống giỏ hàng cũ bắt buộc ID là số, nhưng với Keycloak ID là chuỗi UUID.
      // Dựa theo code cũ của bạn đang map number, hãy đảm bảo Backend giỏ hàng chấp nhận UUID chuỗi.
      this.router.navigate(['/cart']);
    }
  }
}
