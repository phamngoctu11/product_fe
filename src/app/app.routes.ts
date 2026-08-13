import { Routes } from '@angular/router';
import { ROUTE_ACCESS } from './config/navigation.config';
import { authGuard, backofficeGuard, storefrontGuard } from './guard/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'management',
    canActivate: [backofficeGuard],
    canActivateChild: [authGuard],
    data: { roles: ROUTE_ACCESS.operations },
    loadComponent: () => import('./layout/backoffice-layout/backoffice-layout.component').then((m) => m.BackofficeLayoutComponent),
    children: [
      { path: '', redirectTo: 'product', pathMatch: 'full' },
      { path: 'product', loadComponent: () => import('./features/management/products/management-products.component').then((m) => m.ManagementProductsComponent) },
      { path: 'product/:id', loadComponent: () => import('./features/shared/product-detail-page/product-page.component').then((m) => m.ProductPageComponent) },
      { path: 'user', data: { roles: ROUTE_ACCESS.management }, loadComponent: () => import('./features/management/user/user').then((m) => m.UserComponent) },
      { path: 'staff-orders', data: { roles: ROUTE_ACCESS.staff }, loadComponent: () => import('./features/management/staff-orders/staff-orders.component').then((m) => m.StaffOrdersComponent) },
      { path: 'commissions', loadComponent: () => import('./features/management/commissions/consultation-commissions.component').then((m) => m.ConsultationCommissionsComponent) },
      { path: 'myinfor', loadComponent: () => import('./features/shared/myinfor/myinfor').then((m) => m.Myinfor) },
      { path: 'admin-orders', data: { roles: ROUTE_ACCESS.management }, loadComponent: () => import('./features/management/admin-order/admin-order.component').then((m) => m.AdminOrderComponent) },
      { path: 'admin-dashboard', data: { roles: ROUTE_ACCESS.management }, loadComponent: () => import('./features/management/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard) },
      { path: 'admin-chat', loadComponent: () => import('./features/management/admin-chat/admin-chat.component').then((m) => m.AdminChatComponent) },
      { path: 'admin-vouchers', data: { roles: ROUTE_ACCESS.management }, loadComponent: () => import('./features/management/voucher-admin/voucher-admin.component').then((m) => m.VoucherAdminComponent) },
    ],
  },
  {
    path: 'store',
    canActivate: [storefrontGuard],
    canActivateChild: [authGuard],
    data: { roles: ROUTE_ACCESS.customer },
    loadComponent: () => import('./layout/storefront-layout/storefront-layout.component').then((m) => m.StorefrontLayoutComponent),
    children: [
      { path: '', redirectTo: 'product', pathMatch: 'full' },
      { path: 'product', loadComponent: () => import('./features/storefront/product/product').then((m) => m.ProductComponent) },
      { path: 'product/:id', loadComponent: () => import('./features/shared/product-detail-page/product-page.component').then((m) => m.ProductPageComponent) },
      { path: 'orders', loadComponent: () => import('./features/storefront/orders/orders').then((m) => m.Orders) },
      { path: 'cart', loadComponent: () => import('./features/storefront/cart/cart-modal').then((m) => m.CartModalComponent) },
      { path: 'wishlist', loadComponent: () => import('./features/storefront/wishlist/wishlist.component').then((m) => m.WishlistComponent) },
      { path: 'consultations', loadComponent: () => import('./features/storefront/consultations/user-consultations.component').then((m) => m.UserConsultationsComponent) },
      { path: 'myinfor', loadComponent: () => import('./features/shared/myinfor/myinfor').then((m) => m.Myinfor) },
      { path: 'payment-success', loadComponent: () => import('./features/storefront/payment-success/payment-success').then((m) => m.PaymentSuccessComponent) },
      { path: 'help/shopping-guide', loadComponent: () => import('./features/shared/static-pages/shopping-guide-page.component').then((m) => m.ShoppingGuidePageComponent) },
      { path: 'help/order-tracking', loadComponent: () => import('./features/shared/static-pages/order-tracking-page.component').then((m) => m.OrderTrackingPageComponent) },
      { path: 'help/payment-methods', loadComponent: () => import('./features/shared/static-pages/payment-methods-page.component').then((m) => m.PaymentMethodsPageComponent) },
      { path: 'help/contact-support', loadComponent: () => import('./features/shared/static-pages/contact-support-page.component').then((m) => m.ContactSupportPageComponent) },
      { path: 'policies/shipping', loadComponent: () => import('./features/shared/static-pages/shipping-policy-page.component').then((m) => m.ShippingPolicyPageComponent) },
      { path: 'policies/returns-refunds', loadComponent: () => import('./features/shared/static-pages/returns-refunds-page.component').then((m) => m.ReturnsRefundsPageComponent) },
      { path: 'policies/warranty', loadComponent: () => import('./features/shared/static-pages/warranty-policy-page.component').then((m) => m.WarrantyPolicyPageComponent) },
      { path: 'policies/privacy', loadComponent: () => import('./features/shared/static-pages/privacy-policy-page.component').then((m) => m.PrivacyPolicyPageComponent) },
    ],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
