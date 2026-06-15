import { Component, OnInit } from '@angular/core'; // Thêm OnInit
import { FormsModule, NgForm } from '@angular/forms';
import { inject as injectToast } from '@angular/core';
import { ToastService } from '../../service/toast.service';
import { Router, ActivatedRoute } from '@angular/router'; // Thêm ActivatedRoute
import { CommonModule } from '@angular/common';
import { AuthService } from '../../service/auth.service';
import { getApiErrorMessage } from '../../model/api-response.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  private readonly toast = injectToast(ToastService);
  isLoginMode = true;

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
    this.route.queryParams.subscribe(params => {
      if (params['mode'] === 'signup') {
        this.isLoginMode = false; // Mở form đăng ký
      } else {
        this.isLoginMode = true;  // Mở form đăng nhập
      }
    });
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    // Tùy chọn: Xóa tham số trên URL để nhìn sạch sẽ hơn khi user bấm lật form tay
    this.router.navigate([], { queryParams: {} });
  }

  handleLogin(form?: NgForm) {
    if (form?.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    if (!this.loginData.username || !this.loginData.password) {
      this.toast.notify('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!');
      return;
    }
    this.auth.login(this.loginData).subscribe({
      next: () => this.router.navigate(['/product']),
      error: (err) => this.toast.notify(getApiErrorMessage(
        err,
        'Đăng nhập thất bại! Vui lòng kiểm tra lại thông tin.',
      )),
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
}
