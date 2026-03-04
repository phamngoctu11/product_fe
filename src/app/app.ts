import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './service/auth.service';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CartModalComponent } from './component/cart/cart-modal';
import { OrderDialogComponent } from './component/orders/orders-dialog/order-dialog';
import { RewardDialogComponent } from './component/reward/reward-dialog';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, MatDialogModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('fe_product');
  authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  // Lấy username hoặc từ localStorage (trong auth.service.ts bạn đang lưu 'username')
  get userLastName(): string {
    return localStorage.getItem('username') || 'User';
  }
  signUp(){
   this.authService
  }
  openCart() {
    const userId = this.authService.getUserId();
    if (userId) {
      this.dialog.open(CartModalComponent, { data: userId, width: '800px' });
    }
  }

  openOrders() {
    const userId = this.authService.getUserId();
    if (userId) {
      this.dialog.open(OrderDialogComponent, { data: userId, width: '800px' });
    }
  }
openRewards() {
    const userId = this.authService.getUserId();
    if (userId) {
      this.dialog.open(RewardDialogComponent, { data: userId, width: '850px' });
    }
  }
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
