import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { inject as injectToast } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { formatRateLimitDelay, getApiErrorMessage, getRetryAfterSeconds } from '../../../model/api-response.model';
import { AuthService } from '../../../service/auth.service';
import { ToastService } from '../../../service/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly toast = injectToast(ToastService);
  private loginRateLimitBaseMessage = '';
  private loginRateLimitRetryAt = 0;
  private loginRateLimitTimer?: ReturnType<typeof setInterval>;

  isLoginMode = true;
  isForgotMode = false;
  isSubmittingLogin = false;
  isSubmittingForgot = false;
  loginErrorMessage = '';
  forgotSuccessMessage = '';
  forgotErrorMessage = '';

  loginData = { username: '', password: '' };
  forgotData = { identifier: '' };

  registerData = {
    username: '',
    password: '',
    confirmPassword: '',
    firstname: '',
    lastname: '',
    gender: 'male',
    phone: '',
    birth: '',
    address: '',
    email: ''
  };

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.router.navigateByUrl(this.auth.getHomeRoute());
      return;
    }
    this.route.queryParams.subscribe(params => {
      if (params['mode'] === 'signup') {
        this.isLoginMode = false;
        this.isForgotMode = false;
      } else if (params['mode'] === 'forgot') {
        this.isLoginMode = true;
        this.isForgotMode = true;
      } else {
        this.isLoginMode = true;
        this.isForgotMode = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.clearLoginRateLimitCountdown();
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.isForgotMode = false;
    this.clearLoginRateLimitCountdown();
    this.loginErrorMessage = '';
    this.router.navigate([], { queryParams: {} });
  }

  openForgotPassword() {
    this.isLoginMode = true;
    this.isForgotMode = true;
    this.clearLoginRateLimitCountdown();
    this.loginErrorMessage = '';
    this.forgotSuccessMessage = '';
    this.forgotErrorMessage = '';
    this.forgotData.identifier = this.loginData.username || '';
    this.router.navigate([], { queryParams: { mode: 'forgot' } });
  }

  backToLogin() {
    this.isLoginMode = true;
    this.isForgotMode = false;
    this.forgotSuccessMessage = '';
    this.forgotErrorMessage = '';
    this.router.navigate([], { queryParams: {} });
  }

  handleLogin(form?: NgForm) {
    this.clearLoginRateLimitCountdown();
    this.loginErrorMessage = '';
    if (form?.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    if (!this.loginData.username || !this.loginData.password) {
      this.loginErrorMessage = 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.';
      this.toast.notify('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!');
      return;
    }
    this.isSubmittingLogin = true;
    this.auth.login(this.loginData).subscribe({
      next: () => {
        this.isSubmittingLogin = false;
        this.router.navigateByUrl(this.auth.getHomeRoute());
      },
      error: (err) => {
        this.isSubmittingLogin = false;
        const errorMessage = getApiErrorMessage(
          err,
          'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.',
        );
        const retryAfterSeconds = getRetryAfterSeconds(err);
        if (retryAfterSeconds) {
          this.startLoginRateLimitCountdown(errorMessage, retryAfterSeconds);
        } else {
          this.loginErrorMessage = errorMessage;
        }
        this.toast.warning(this.loginErrorMessage);
      },
    });
  }

  handleForgotPassword(form?: NgForm) {
    this.forgotSuccessMessage = '';
    this.forgotErrorMessage = '';
    if (form?.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isSubmittingForgot = true;
    this.auth.requestPasswordReset(this.forgotData).subscribe({
      next: () => {
        this.isSubmittingForgot = false;
        this.forgotSuccessMessage = 'Nếu tài khoản tồn tại, liên kết đặt lại mật khẩu đã được gửi qua email.';
      },
      error: (err) => {
        this.isSubmittingForgot = false;
        this.forgotErrorMessage = getApiErrorMessage(err, 'Không thể gửi yêu cầu đặt lại mật khẩu.');
      },
    });
  }

  handleRegister(form?: NgForm) {
    if (form?.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.toast.notify('Mật khẩu xác nhận không khớp!');
      return;
    }
    if (!this.registerData.username || !this.registerData.password || !this.registerData.firstname || !this.registerData.phone) {
      this.toast.notify('Vui lòng điền các trường có dấu * bắt buộc!');
      return;
    }

    const payload = {
      username: this.registerData.username,
      password: this.registerData.password,
      firstname: this.registerData.firstname,
      lastname: this.registerData.lastname,
      gender: this.registerData.gender,
      phone: this.registerData.phone,
      birth: this.registerData.birth,
      address: this.registerData.address,
      email: this.registerData.email
    };

    this.auth.register(payload).subscribe({
      next: () => {
        this.toast.notify('Đăng ký tài khoản thành công. Bạn có thể đăng nhập ngay.');
        this.loginData.username = this.registerData.username;
        this.loginData.password = '';
        this.isLoginMode = true;
        this.isForgotMode = false;
        this.router.navigate([], { queryParams: {} });
      },
      error: (err) => {
        this.toast.notify('Đăng ký thất bại: ' + getApiErrorMessage(err, 'Tên đăng nhập hoặc SĐT có thể đã tồn tại.'));
      }
    });
  }

  private startLoginRateLimitCountdown(baseMessage: string, retryAfterSeconds: number): void {
    this.clearLoginRateLimitCountdown();
    this.loginRateLimitBaseMessage = baseMessage;
    this.loginRateLimitRetryAt = Date.now() + retryAfterSeconds * 1000;
    this.updateLoginRateLimitMessage();
    this.loginRateLimitTimer = setInterval(() => this.updateLoginRateLimitMessage(), 1000);
  }

  private updateLoginRateLimitMessage(): void {
    const remainingSeconds = Math.ceil((this.loginRateLimitRetryAt - Date.now()) / 1000);
    if (remainingSeconds <= 0) {
      this.clearLoginRateLimitCountdown();
      this.loginErrorMessage = '';
      return;
    }

    this.loginErrorMessage = `${this.loginRateLimitBaseMessage} Vui lòng thử lại sau ${formatRateLimitDelay(remainingSeconds)}.`;
  }

  private clearLoginRateLimitCountdown(): void {
    if (this.loginRateLimitTimer) {
      clearInterval(this.loginRateLimitTimer);
      this.loginRateLimitTimer = undefined;
    }
    this.loginRateLimitBaseMessage = '';
    this.loginRateLimitRetryAt = 0;
  }
}
