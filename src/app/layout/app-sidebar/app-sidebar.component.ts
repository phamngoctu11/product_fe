import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../service/auth.service';
import { APP_NAVIGATION } from '../../config/navigation.config';
import type { AppNavigationItem } from '../../config/navigation.config';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-sidebar.component.html',
})
export class AppSidebarComponent {
  private readonly authService = inject(AuthService);

  @Input() collapsed = false;
  @Output() toggleCollapsed = new EventEmitter<void>();
  @Output() navigationSelected = new EventEmitter<void>();

  readonly navigation = APP_NAVIGATION;

  canShow(item: AppNavigationItem): boolean {
    const currentRole = this.authService.getUserRole();
    return !item.roles || item.roles.some((role) => role === currentRole);
  }
}
