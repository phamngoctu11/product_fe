import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
})
export class LoginComponent {
  loginData = { username: '', password: '' };
  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}
  handleLogin() {
    this.auth.login(this.loginData).subscribe({
      next: () => this.router.navigate(['/product']),
      error: () => alert('Đăng nhập thất bại!'),
    });
  }
}
