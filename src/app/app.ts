import { Component, HostListener, inject, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './service/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { CartModalComponent } from './component/cart/cart-modal';
import { RewardDialogComponent } from './component/reward/reward-dialog';
import { SettingsModalComponent } from './component/setting/settings-modal';
import { ThemeService } from './service/theme.service';
import { UserService } from './service/user.service';
import { WebsocketService } from './service/websocket.service';
import { NotificationService } from './service/notification.service';
import { TimeAgoPipe } from './pipes/time-ago.pipe';
import { ToastContainerComponent } from './component/toast-container/toast-container.component';
import { filter, Subscription } from 'rxjs';
import { AppSidebarComponent } from './layout/app-sidebar/app-sidebar.component';
import { AppFooterComponent } from './layout/app-footer/app-footer.component';
import { APP_DIALOG_SIZE } from './config/dialog.config';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    TimeAgoPipe,
    ToastContainerComponent,
    AppSidebarComponent,
    AppFooterComponent,
  ],
  templateUrl: './app.html',
})
export class App implements OnInit, OnDestroy {
  authService = inject(AuthService);
  userService = inject(UserService);

  private dialog = inject(MatDialog);
  private router = inject(Router);
  private readonly mobileBreakpoint = 992;

  currentUserDisplayName = '';
  userAvatarUrl: string = '';
  isCurrentUserLoading = false;
  isSidebarCollapsed = false;
  isMobileSidebarOpen = false;
  notifications: any[] = [];
  unreadCount: number = 0;
  private activeSessionUserId: string | null = null;
  private readonly appSubscriptions = new Subscription();
  private sessionSubscriptions = new Subscription();

  constructor(
    private themeService: ThemeService,
    private websocketService: WebsocketService,
    private notificationService: NotificationService
  ) {}

  get currentRole(): string {
    return this.authService.getUserRole() || 'Khách';
  }

  get displayName(): string {
    return this.currentUserDisplayName;
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

  openCart() {
    const userId = this.authService.getUserId();
    if (userId) {
      this.dialog.open(CartModalComponent, {
        data: userId,
        ...APP_DIALOG_SIZE.cart,
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
        ...APP_DIALOG_SIZE.reward,
      });
    }
  }

  openSettings() {
    this.dialog.open(SettingsModalComponent, {
      ...APP_DIALOG_SIZE.compact,
      disableClose: false
    });
  }

  ngOnInit() {
    this.appSubscriptions.add(this.userService.currentUser$.subscribe((user) => {
      if (!user) {
        this.currentUserDisplayName = '';
        this.userAvatarUrl = '';
        return;
      }
      this.currentUserDisplayName = [user.lastname, user.firstname].filter(Boolean).join(' ');
      this.userAvatarUrl = user.avatar_url || '';
      this.isCurrentUserLoading = false;
    }));

    this.appSubscriptions.add(this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.syncAuthenticatedSession()));

    this.syncAuthenticatedSession();
  }

  private syncAuthenticatedSession(): void {
    const userId = this.authService.getUserId();
    if (!this.authService.isLoggedIn() || !userId) {
      this.stopAuthenticatedSession();
      return;
    }
    if (this.activeSessionUserId === userId) return;

    this.stopAuthenticatedSession();
    this.activeSessionUserId = userId;
    this.isCurrentUserLoading = true;
    const isAdmin = this.authService.isAdmin();

    this.sessionSubscriptions.add(this.notificationService.getMyHistory(isAdmin).subscribe({
      next: (data) => {
        this.notifications = data;
        this.unreadCount = data.filter((notification) => !notification.read).length;
      },
    }));

    this.websocketService.connect(isAdmin, userId);
    this.sessionSubscriptions.add(this.websocketService.notifications$.subscribe((notification) => {
      this.notifications.unshift(notification);
      this.unreadCount++;
    }));

    this.sessionSubscriptions.add(this.userService.getMe().subscribe({
      error: () => {
        this.isCurrentUserLoading = false;
        this.activeSessionUserId = null;
      },
    }));
  }

  private stopAuthenticatedSession(): void {
    this.sessionSubscriptions.unsubscribe();
    this.sessionSubscriptions = new Subscription();
    this.websocketService.disconnect();
    this.activeSessionUserId = null;
    this.notifications = [];
    this.unreadCount = 0;
    this.isCurrentUserLoading = false;
    this.userService.clearCurrentUser();
  }

  markAsRead() {
    const userId = this.authService.getUserId();
    const isAdmin = this.authService.isAdmin();
    if (this.unreadCount > 0 && userId) {
      this.unreadCount = 0;
      this.notificationService.markMyHistoryAsRead(isAdmin).subscribe();
      this.notifications.forEach(n => n.read = true);
    }
  }

  ngOnDestroy() {
    this.stopAuthenticatedSession();
    this.appSubscriptions.unsubscribe();
  }

  logout() {
    this.authService.logout();
    this.stopAuthenticatedSession();
    this.router.navigate(['/login']);
  }
}
