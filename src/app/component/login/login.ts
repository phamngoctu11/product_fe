import { Component, OnDestroy, OnInit } from '@angular/core'; // Thêm OnInit
import { FormsModule, NgForm } from '@angular/forms';
import { inject as injectToast } from '@angular/core';
import { ToastService } from '../../service/toast.service';
import { Router, ActivatedRoute } from '@angular/router'; // Thêm ActivatedRoute
import { CommonModule } from '@angular/common';
import { AuthService } from '../../service/auth.service';
import { formatRateLimitDelay, getApiErrorMessage, getRetryAfterSeconds } from '../../model/api-response.model';

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
  isSubmittingLogin = false;
  loginErrorMessage = '';

  loginData = { username: '', password: '' };

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
    private route: ActivatedRoute // Inject thêm dòng này
  ) {}

  // LẮNG NGHE URL KHI COMPONENT VỪA KHỞI TẠO
  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/product']);
      return;
    }
    this.route.queryParams.subscribe(params => {
      if (params['mode'] === 'signup') {
        this.isLoginMode = false; // Mở form đăng ký
      } else {
        this.isLoginMode = true;  // Mở form đăng nhập
      }
    });
  }

  ngOnDestroy(): void {
    this.clearLoginRateLimitCountdown();
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.clearLoginRateLimitCountdown();
    this.loginErrorMessage = '';
    // Tùy chọn: Xóa tham số trên URL để nhìn sạch sẽ hơn khi user bấm lật form tay
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
        this.router.navigate(['/product']);
      },
      error: (err) => {
        this.isSubmittingLogin = false;
        const errorMessage = getApiErrorMessage(
          err,
        'Đăng nhập thất bại! Vui lòng kiểm tra lại thông tin.',
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
      next: (res) => {
        this.toast.notify('Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.');
        this.loginData.username = this.registerData.username;
        this.loginData.password = '';
        this.isLoginMode = true;
        this.router.navigate([], { queryParams: {} }); // Xóa param signup trên url
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
