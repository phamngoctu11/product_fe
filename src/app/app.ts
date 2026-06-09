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
import { ChatWidgetComponent } from './component/chat/chat-widget.component';
import { TimeAgoPipe } from './pipes/time-ago.pipe';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    MatDialogModule,
    ChatWidgetComponent,
    TimeAgoPipe,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('fe_product');
  authService = inject(AuthService);
  userService = inject(UserService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private readonly mobileBreakpoint = 992;
  userLastNamee: string = '';
  userAvatarUrl: string = '';
  isSidebarCollapsed = false;
  isMobileSidebarOpen = false;

  // Kho lưu trữ thông báo
  notifications: any[] = [];
  unreadCount: number = 0;

  constructor(
    private themeService: ThemeService,
    private websocketService: WebsocketService,
    private notificationService: NotificationService
  ) {}

  get userLastName(): string {
    return localStorage.getItem('username') || 'User';
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
      // 1. NGAY LÚC MỞ TRANG (HOẶC F5): Tải toàn bộ thông báo cũ từ Database
      this.notificationService.getHistory(userId, isAdmin).subscribe({
        next: (data) => {
          this.notifications = data;
          // Tính số lượng tin nhắn chưa đọc (isRead === false)
          this.unreadCount = data.filter(n => !n.read).length;
        }
      });

      // 2. KẾT NỐI WEBSOCKET: Nghe ngóng thông báo MỚI tinh đang tới
      this.websocketService.connect(isAdmin, userId);

      this.websocketService.notifications$.subscribe(notification => {
        // Đẩy lên đầu danh sách và tăng số đỏ
        this.notifications.unshift(notification);
        this.unreadCount++;
      });

      // Lấy avatar và tên User (như cũ)
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
      this.unreadCount = 0; // Xóa số đỏ trên Frontend trước cho mượt

      // Cập nhật trạng thái "đã đọc" xuống Database
      this.notificationService.markAllAsRead(userId, isAdmin).subscribe();

      // Đổi thủ công biến read trong mảng thành true
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
