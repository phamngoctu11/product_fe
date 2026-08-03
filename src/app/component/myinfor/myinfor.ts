import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { UserService } from '../../service/user.service';
import { AuthService } from '../../service/auth.service';
import { ReputationHistory, UserInforDTO } from '../../model/user.model';
import { Userdetail } from '../userdetail/userdetail';
import { PageHeaderComponent, ViewStateComponent } from '../shared';
import { APP_DIALOG_SIZE } from '../../config/dialog.config';
import { getApiErrorMessage } from '../../model/api-response.model';

@Component({
  selector: 'app-myinfor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, PageHeaderComponent, ViewStateComponent],
  templateUrl: './myinfor.html',
})
export class Myinfor implements OnInit {
  userInfo?: UserInforDTO;
  reputationHistory: ReputationHistory[] = [];
  isLoading = true;
  errorMessage = '';
  isLoadingReputationHistory = false;
  reputationHistoryError = '';
  reputationHistoryPage = -1;
  reputationHistoryTotalPages = 0;
  readonly reputationHistoryPageSize = 5;
  hasMoreReputationHistory = false;
  showChangePassword = false;
  isChangingPassword = false;
  changePasswordSuccess = '';
  changePasswordError = '';
  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

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

  loadReputationHistory(reset: boolean = true): void {
    if (this.isLoadingReputationHistory) return;
    this.isLoadingReputationHistory = true;
    this.reputationHistoryError = '';
    const nextPage = reset ? 0 : this.reputationHistoryPage + 1;
    this.userService.getMyReputationHistory(nextPage, this.reputationHistoryPageSize).subscribe({
      next: (page) => {
        const content = page.content || [];
        this.reputationHistory = reset ? content : [...this.reputationHistory, ...content];
        this.reputationHistoryPage = page.number ?? nextPage;
        this.reputationHistoryTotalPages = page.totalPages ?? 0;
        this.hasMoreReputationHistory = this.reputationHistoryPage + 1 < this.reputationHistoryTotalPages;
        this.isLoadingReputationHistory = false;
      },
      error: () => {
        this.reputationHistoryError = 'Không thể tải lịch sử điểm uy tín.';
        this.isLoadingReputationHistory = false;
      },
    });
  }

  loadMoreReputationHistory(): void {
    this.loadReputationHistory(false);
  }

  toggleChangePassword(): void {
    this.showChangePassword = !this.showChangePassword;
    this.changePasswordSuccess = '';
    this.changePasswordError = '';
    this.passwordData = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
  }

  changePassword(form?: NgForm): void {
    this.changePasswordSuccess = '';
    this.changePasswordError = '';
    if (form?.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.changePasswordError = 'Mật khẩu xác nhận không khớp.';
      return;
    }

    this.isChangingPassword = true;
    this.userService.changeMyPassword(this.passwordData).subscribe({
      next: () => {
        this.isChangingPassword = false;
        this.changePasswordSuccess = 'Đổi mật khẩu thành công.';
        this.passwordData = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        };
        form?.resetForm();
      },
      error: (err) => {
        this.isChangingPassword = false;
        this.changePasswordError = getApiErrorMessage(err, 'Không thể đổi mật khẩu.');
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
