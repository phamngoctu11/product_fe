import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { getApiErrorMessage } from '../../model/api-response.model';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: '../login/login.css',
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  passwordData = {
    newPassword: '',
    confirmPassword: '',
  };
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.errorMessage = 'Liên kết đặt lại mật khẩu không hợp lệ.';
    }
  }

  submit(form?: NgForm): void {
    this.successMessage = '';
    this.errorMessage = '';
    if (!this.token) {
      this.errorMessage = 'Liên kết đặt lại mật khẩu không hợp lệ.';
      return;
    }
    if (form?.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.errorMessage = 'Mật khẩu xác nhận không khớp.';
      return;
    }

    this.isSubmitting = true;
    this.authService.resetPassword({
      token: this.token,
      newPassword: this.passwordData.newPassword,
      confirmPassword: this.passwordData.confirmPassword,
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.';
        this.passwordData = { newPassword: '', confirmPassword: '' };
        setTimeout(() => this.router.navigate(['/login']), 1800);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = getApiErrorMessage(err, 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
      },
    });
  }
}
