import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './service/auth.service';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CartModalComponent } from './component/cart/cart-modal';
import { RewardDialogComponent } from './component/reward/reward-dialog';
import { Orders } from './component/orders/orders';
import { SettingsModalComponent } from './component/setting/settings-modal';
import { ThemeService } from './service/theme.service';

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

  // Inject ThemeService để tự động đổi màu khi F5
  constructor(private themeService: ThemeService) {}

  get userLastName(): string {
    return localStorage.getItem('username') || 'User';
  }

  signUp() {
    // Code xử lý signup sau
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
     this.router.navigate(['/orders']);
    }
  }

  openRewards() {
    const userId = this.authService.getUserId();
    if (userId) {
      this.dialog.open(RewardDialogComponent, { data: userId, width: '850px' });
    }
  }

  openSettings() {
    this.dialog.open(SettingsModalComponent, {
      width: '500px',
      disableClose: false
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
