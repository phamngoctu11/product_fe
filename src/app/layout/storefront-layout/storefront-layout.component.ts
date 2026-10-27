import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, Subscription, switchMap } from 'rxjs';
import { SfFooterComponent } from '../../features/storefront/ui/footer/sf-footer.component';
import { AuthService } from '../../service/auth.service';
import { UserService } from '../../service/user.service';
import { NotificationService } from '../../service/notification.service';
import { WebsocketService } from '../../service/websocket.service';
import { SettingsModalComponent } from '../../features/shared/setting/settings-modal';
import { RewardDialogComponent } from '../../features/storefront/reward/reward-dialog';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { APP_DIALOG_SIZE } from '../../config/dialog.config';
import { ProductService } from '../../service/product.service';
import { Product, ProductSearchSuggestions } from '../../model/product.model';

@Component({
  selector: 'app-storefront-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive, SfFooterComponent, TimeAgoPipe],
  templateUrl: './storefront-layout.component.html',
  styleUrl: './storefront-layout.component.css',
})
export class StorefrontLayoutComponent implements OnInit, OnDestroy {
  isScrolled = false;
  isMobileMenuOpen = false;
  
  @HostListener('window:scroll')
  onWindowScroll() {
    this.isScrolled = window.scrollY > 20;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  displayName = '';
  avatarUrl = '';
  isUserLoading = true;
  isCustomerSession = false;
  notifications: any[] = [];
  unreadCount = 0;
  isLoadingNotifications = false;
  isMarkingRead = false;
  isSearchOpen = false;
  isSearchLoading = false;
  searchTerm = '';
  searchSuggestions: ProductSearchSuggestions = { productTypes: [], products: [], totalProducts: 0 };
  searchFailed = false;
  private page = -1;
  private totalPages = 0;
  private readonly pageSize = 10;
  private readonly subscriptions = new Subscription();
  private readonly searchTerms = new Subject<string>();

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly websocketService: WebsocketService,
    private readonly dialog: MatDialog,
    private readonly router: Router,
    private readonly productService: ProductService,
    private readonly elementRef: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(this.searchTerms.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap((keyword) => {
        if (keyword.length < 2) return of({ productTypes: [], products: [], totalProducts: 0 } satisfies ProductSearchSuggestions);
        this.isSearchLoading = true;
        this.searchFailed = false;
        return this.productService.getSearchSuggestions(keyword, 3).pipe(
          catchError(() => {
            this.searchFailed = true;
            return of({ productTypes: [], products: [], totalProducts: 0 } satisfies ProductSearchSuggestions);
          }),
        );
      }),
    ).subscribe((suggestions) => {
      this.searchSuggestions = suggestions;
      this.isSearchLoading = false;
    }));

    this.isCustomerSession = this.authService.isCustomer();
    if (!this.isCustomerSession) {
      this.displayName = 'Khách';
      this.isUserLoading = false;
      return;
    }

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

  toggleSearch(): void {
    this.isSearchOpen = !this.isSearchOpen;
    if (this.isSearchOpen) this.searchTerms.next(this.searchTerm.trim());
  }

  onSearchChange(value: string): void {
    this.searchTerm = value || '';
    const keyword = this.searchTerm.trim();
    this.isSearchOpen = true;
    if (keyword.length < 2) {
      this.searchSuggestions = { productTypes: [], products: [], totalProducts: 0 };
      this.isSearchLoading = false;
      this.searchFailed = false;
    }
    this.searchTerms.next(keyword);
  }

  submitSearch(keyword = this.searchTerm): void {
    const query = keyword.trim();
    if (query.length < 2) return;
    this.isSearchOpen = false;
    this.router.navigate(['/store/product'], { queryParams: { keyword: query } });
  }

  openProductType(typeId: number): void {
    this.isSearchOpen = false;
    this.router.navigate(['/store/product'], { queryParams: { productTypeId: typeId } });
  }

  openProductSuggestion(product: Product): void {
    this.submitSearch(product.product_name || this.searchTerm);
  }

  @HostListener('document:click', ['$event'])
  closeSearchOnOutsideClick(event: MouseEvent): void {
    const search = this.elementRef.nativeElement.querySelector('.sf-search');
    if (search && !search.contains(event.target as Node)) this.isSearchOpen = false;
  }

  @HostListener('document:keydown.escape')
  closeSearchOnEscape(): void {
    this.isSearchOpen = false;
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
    if (!this.isCustomerSession) {
      this.router.navigate(['/login'], { queryParams: { mode: 'signup' } });
      return;
    }
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
