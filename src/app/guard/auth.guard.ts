import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';
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
