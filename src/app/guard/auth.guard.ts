import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../service/auth.service';
import { ActionDialogService } from '../service/action-dialog.service';
import type { AppRole } from '../config/navigation.config';

export const authGuard: CanActivateChildFn = (childRoute) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  const allowedRoles = childRoute.data?.['roles'] as readonly AppRole[] | undefined;
  if (!allowedRoles?.length) {
    return true;
  }

  const currentRole = authService.getUserRole();
  return allowedRoles.some((role) => role === currentRole)
    ? true
    : router.createUrlTree([authService.getHomeRoute()]);
};

export const backofficeGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isLoggedIn()) return router.createUrlTree(['/login']);
  return authService.isAdmin() || authService.isStaff()
    ? true
    : router.createUrlTree([authService.getHomeRoute()]);
};

export const storefrontGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isLoggedIn()) return router.createUrlTree(['/login']);
  return authService.isCustomer()
    ? true
    : router.createUrlTree([authService.getHomeRoute()]);
};

export const customRequestMemberGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    const actionDialog = inject(ActionDialogService);
    return actionDialog.confirm({
      title: 'Đặt làm riêng dành cho thành viên',
      message: 'Đơn đặt làm riêng chỉ dành cho thành viên ClayArt. Hãy đăng ký để tạo món đồ dành riêng cho mình và nhận thêm nhiều ưu đãi nhé.',
      confirmText: 'Đăng ký tài khoản',
      cancelText: 'Thoát',
      tone: 'primary',
      icon: 'bi-person-heart',
    }).pipe(map((register) => register
      ? router.createUrlTree(['/login'], { queryParams: { mode: 'signup' } })
      : router.createUrlTree(['/store/product'])));
  }

  return authService.isCustomer()
    ? true
    : router.createUrlTree([authService.getHomeRoute()]);
};
