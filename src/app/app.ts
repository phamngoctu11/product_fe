import { Component, HostListener, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './service/auth.service';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CartModalComponent } from './component/cart/cart-modal';
import { RewardDialogComponent } from './component/reward/reward-dialog';
import { Orders } from './component/orders/orders';
import { SettingsModalComponent } from './component/setting/settings-modal';
import { ThemeService } from './service/theme.service';
import { UserService } from './service/user.service';
import { WebsocketService } from './service/websocket.service';
import { NotificationService } from './service/notification.service';
import { TimeAgoPipe } from './pipes/time-ago.pipe';
import { ToastContainerComponent } from './component/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    MatDialogModule,
    TimeAgoPipe,
    ToastContainerComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css', './app-shell.css'],
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('fe_product');
  readonly currentYear = new Date().getFullYear();
  authService = inject(AuthService);
  userService = inject(UserService);

  private dialog = inject(MatDialog);
  private router = inject(Router);
  private readonly mobileBreakpoint = 992;

  userLastNamee: string = '';
  userAvatarUrl: string = '';
  isSidebarCollapsed = false;
  isMobileSidebarOpen = false;
  notifications: any[] = [];
  unreadCount: number = 0;

  constructor(
    private themeService: ThemeService,
    private websocketService: WebsocketService,
    private notificationService: NotificationService
  ) {}

  // Lấy Username từ Token
  get userLastName(): string {
    return this.authService.getCurrentUserName() || 'User';
  }

  get currentRole(): string {
    return this.authService.getUserRole() || 'Khách';
  }

  get displayName(): string {
    return this.userLastNamee || this.userLastName;
  }

  toggleSidebar() {
    if (this.isMobileViewport()) {
      this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
      return;
    }
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  closeMobileSidebar() {
    this.isMobileSidebarOpen = false;
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (!this.isMobileViewport()) {
      this.isMobileSidebarOpen = false;
    }
  }

  private isMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < this.mobileBreakpoint;
  }

  signUp() {
    // Code xử lý signup sau
  }

  openCart() {
    const userId = this.authService.getUserId();
    if (userId) {
      this.dialog.open(CartModalComponent, {
        data: userId,
        width: '900px',
        maxWidth: 'calc(100vw - 48px)',
        maxHeight: '78vh',
      });
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
      this.dialog.open(RewardDialogComponent, {
        data: userId,
        width: '920px',
        maxWidth: 'calc(100vw - 48px)',
        maxHeight: '78vh',
      });
    }
  }

  openSettings() {
    this.dialog.open(SettingsModalComponent, {
      width: '500px',
      disableClose: false
    });
  }

  ngOnInit() {
    const userId = this.authService.getUserId();
    const isAdmin = this.authService.isAdmin();

    if (this.authService.isLoggedIn() && userId) {
      this.notificationService.getHistory(userId, isAdmin).subscribe({
        next: (data) => {
          this.notifications = data;
          this.unreadCount = data.filter(n => !n.read).length;
        }
      });

      this.websocketService.connect(isAdmin, userId);
      this.websocketService.notifications$.subscribe(notification => {
        this.notifications.unshift(notification);
        this.unreadCount++;
      });

      this.userService.getById(userId).subscribe({
        next: (res: any) => {
          this.userLastNamee = res.lastname;
          this.userAvatarUrl = res.avatar_url || res.imageUrl || '';
        }
      });
    }
  }

  markAsRead() {
    const userId = this.authService.getUserId();
    const isAdmin = this.authService.isAdmin();
    if (this.unreadCount > 0 && userId) {
      this.unreadCount = 0;
      this.notificationService.markAllAsRead(userId, isAdmin).subscribe();
      this.notifications.forEach(n => n.read = true);
    }
  }

  ngOnDestroy() {
    this.websocketService.disconnect();
  }

  logout() {
    this.websocketService.disconnect();
    this.notifications = [];
    this.unreadCount = 0;
    this.userLastNamee = '';
    this.userAvatarUrl = '';
    this.authService.logout();
    window.location.href = '/login';
  }
}
