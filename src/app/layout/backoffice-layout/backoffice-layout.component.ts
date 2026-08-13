import { Component, HostListener, inject, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../service/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { SettingsModalComponent } from '../../features/shared/setting/settings-modal';
import { ThemeService } from '../../service/theme.service';
import { UserService } from '../../service/user.service';
import { WebsocketService } from '../../service/websocket.service';
import { NotificationService } from '../../service/notification.service';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { filter, Subscription } from 'rxjs';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar.component';
import { AppFooterComponent } from '../app-footer/app-footer.component';
import { APP_DIALOG_SIZE } from '../../config/dialog.config';

@Component({
  selector: 'app-backoffice-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    TimeAgoPipe,
    AppSidebarComponent,
    AppFooterComponent,
  ],
  templateUrl: './backoffice-layout.component.html',
})
export class BackofficeLayoutComponent implements OnInit, OnDestroy {
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
  isMarkingNotificationsRead = false;
  isLoadingNotifications = false;
  private activeSessionUserId: string | null = null;
  private notificationPage = -1;
  private notificationTotalPages = 0;
  private readonly notificationPageSize = 10;
  private hasMoreNotifications = true;
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

  get notificationRoute(): string {
    if (this.authService.isStaff()) return '/management/staff-orders';
    return '/management/admin-orders';
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

    this.loadNotifications(true);
    this.loadNotificationUnreadCount();

    this.websocketService.connect(isAdmin, userId);
    this.sessionSubscriptions.add(this.websocketService.notifications$.subscribe((notification) => {
      if (notification?.id && this.notifications.some((item) => item.id === notification.id)) {
        return;
      }

      this.notifications.unshift(notification);
      if (!notification?.read) {
        this.unreadCount++;
      }
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
    this.isMarkingNotificationsRead = false;
    this.isLoadingNotifications = false;
    this.notificationPage = -1;
    this.notificationTotalPages = 0;
    this.hasMoreNotifications = true;
    this.isCurrentUserLoading = false;
    this.userService.clearCurrentUser();
  }

  loadNotifications(reset: boolean = false): void {
    if (!this.activeSessionUserId || this.isLoadingNotifications) return;
    if (!reset && !this.hasMoreNotifications) return;

    const nextPage = reset ? 0 : this.notificationPage + 1;
    this.isLoadingNotifications = true;
    this.sessionSubscriptions.add(this.notificationService
      .getMyHistory(this.authService.isAdmin(), nextPage, this.notificationPageSize)
      .subscribe({
        next: (page) => {
          const content = page.content || [];
          this.notifications = reset
            ? content
            : [
                ...this.notifications,
                ...content.filter((notification) =>
                  !notification?.id || !this.notifications.some((item) => item.id === notification.id)
                ),
              ];
          this.notificationPage = page.number ?? nextPage;
          this.notificationTotalPages = page.totalPages ?? 0;
          this.hasMoreNotifications = this.notificationPage + 1 < this.notificationTotalPages;
          this.isLoadingNotifications = false;
        },
        error: () => {
          this.isLoadingNotifications = false;
        },
      }));
  }

  private loadNotificationUnreadCount(): void {
    this.sessionSubscriptions.add(this.notificationService
      .getMyUnreadCount(this.authService.isAdmin())
      .subscribe({
        next: (count) => {
          this.unreadCount = Math.max(0, Number(count) || 0);
        },
      }));
  }

  onNotificationsScroll(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceToBottom <= 48) {
      this.loadNotifications(false);
    }
  }

  markAsRead() {
    const userId = this.authService.getUserId();
    const isAdmin = this.authService.isAdmin();
    if (this.unreadCount > 0 && userId && !this.isMarkingNotificationsRead) {
      this.isMarkingNotificationsRead = true;
      this.notificationService.markMyHistoryAsRead(isAdmin).subscribe({
        next: () => {
          this.unreadCount = 0;
          this.notifications.forEach(n => n.read = true);
          this.isMarkingNotificationsRead = false;
        },
        error: () => {
          this.isMarkingNotificationsRead = false;
        },
      });
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
