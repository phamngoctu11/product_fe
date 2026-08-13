import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { AppFooterComponent } from '../app-footer/app-footer.component';
import { AuthService } from '../../service/auth.service';
import { UserService } from '../../service/user.service';
import { NotificationService } from '../../service/notification.service';
import { WebsocketService } from '../../service/websocket.service';
import { SettingsModalComponent } from '../../features/shared/setting/settings-modal';
import { RewardDialogComponent } from '../../features/storefront/reward/reward-dialog';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { APP_DIALOG_SIZE } from '../../config/dialog.config';

@Component({
  selector: 'app-storefront-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AppFooterComponent, TimeAgoPipe],
  templateUrl: './storefront-layout.component.html',
})
export class StorefrontLayoutComponent implements OnInit, OnDestroy {
  displayName = '';
  avatarUrl = '';
  isUserLoading = true;
  notifications: any[] = [];
  unreadCount = 0;
  isLoadingNotifications = false;
  isMarkingRead = false;
  private page = -1;
  private totalPages = 0;
  private readonly pageSize = 10;
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly websocketService: WebsocketService,
    private readonly dialog: MatDialog,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(this.userService.currentUser$.subscribe((user) => {
      if (!user) return;
      this.displayName = [user.lastname, user.firstname].filter(Boolean).join(' ');
      this.avatarUrl = user.avatar_url || '';
      this.isUserLoading = false;
    }));
    this.subscriptions.add(this.userService.getMe().subscribe({ error: () => this.isUserLoading = false }));
    this.loadNotifications(true);
    this.subscriptions.add(this.notificationService.getMyUnreadCount(false).subscribe({
      next: (count) => this.unreadCount = Math.max(0, Number(count) || 0),
    }));

    const userId = this.authService.getUserId();
    if (userId) {
      this.websocketService.connect(false, userId);
      this.subscriptions.add(this.websocketService.notifications$.subscribe((notification) => {
        if (notification?.id && this.notifications.some((item) => item.id === notification.id)) return;
        this.notifications.unshift(notification);
        if (!notification?.read) this.unreadCount++;
      }));
    }
  }

  loadNotifications(reset = false): void {
    if (this.isLoadingNotifications || (!reset && this.page + 1 >= this.totalPages)) return;
    const nextPage = reset ? 0 : this.page + 1;
    this.isLoadingNotifications = true;
    this.subscriptions.add(this.notificationService.getMyHistory(false, nextPage, this.pageSize).subscribe({
      next: (page) => {
        const content = page.content || [];
        this.notifications = reset ? content : [...this.notifications, ...content];
        this.page = page.number ?? nextPage;
        this.totalPages = page.totalPages ?? 0;
        this.isLoadingNotifications = false;
      },
      error: () => this.isLoadingNotifications = false,
    }));
  }

  onNotificationsScroll(event: Event): void {
    const element = event.target as HTMLElement;
    if (element.scrollHeight - element.scrollTop - element.clientHeight <= 48) this.loadNotifications();
  }

  markAsRead(): void {
    if (!this.unreadCount || this.isMarkingRead) return;
    this.isMarkingRead = true;
    this.notificationService.markMyHistoryAsRead(false).subscribe({
      next: () => {
        this.unreadCount = 0;
        this.notifications.forEach((notification) => notification.read = true);
        this.isMarkingRead = false;
      },
      error: () => this.isMarkingRead = false,
    });
  }

  openRewards(): void {
    const userId = this.authService.getUserId();
    if (userId) this.dialog.open(RewardDialogComponent, { data: userId, ...APP_DIALOG_SIZE.reward });
  }

  openSettings(): void {
    this.dialog.open(SettingsModalComponent, { ...APP_DIALOG_SIZE.compact, disableClose: false });
  }

  logout(): void {
    this.authService.logout();
    this.websocketService.disconnect();
    this.userService.clearCurrentUser();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.websocketService.disconnect();
    this.subscriptions.unsubscribe();
  }
}
