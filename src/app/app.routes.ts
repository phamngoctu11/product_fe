import { Routes } from '@angular/router';
import { ROUTE_ACCESS } from './config/navigation.config';
import { authGuard, backofficeGuard, customRequestMemberGuard, storefrontGuard } from './guard/auth.guard';

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
      { path: 'product-types', data: { roles: ROUTE_ACCESS.management }, loadComponent: () => import('./features/management/product-types/product-types.component').then((m) => m.ProductTypesComponent) },
      { path: 'product/:id', loadComponent: () => import('./features/shared/product-detail-page/product-page.component').then((m) => m.ProductPageComponent) },
      { path: 'user', data: { roles: ROUTE_ACCESS.management }, loadComponent: () => import('./features/management/user/user').then((m) => m.UserComponent) },
      { path: 'staff-orders', data: { roles: ROUTE_ACCESS.staff }, loadComponent: () => import('./features/management/staff-orders/staff-orders.component').then((m) => m.StaffOrdersComponent) },
      { path: 'staff-custom-orders', data: { roles: ROUTE_ACCESS.staff }, loadComponent: () => import('./features/management/staff-custom-orders/staff-custom-orders.component').then((m) => m.StaffCustomOrdersComponent) },
      { path: 'myinfor', loadComponent: () => import('./features/shared/myinfor/myinfor').then((m) => m.Myinfor) },
      { path: 'admin-orders', data: { roles: ROUTE_ACCESS.manager }, loadComponent: () => import('./features/management/admin-order/admin-order.component').then((m) => m.AdminOrderComponent) },
      { path: 'admin-dashboard', data: { roles: ROUTE_ACCESS.management }, loadComponent: () => import('./features/management/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard) },
      { path: 'admin-vouchers', data: { roles: ROUTE_ACCESS.management }, loadComponent: () => import('./features/management/voucher-admin/voucher-admin.component').then((m) => m.VoucherAdminComponent) },
      { path: 'workflow-operations', data: { roles: ROUTE_ACCESS.management }, loadComponent: () => import('./features/management/workflow-operations/workflow-operations.component').then((m) => m.WorkflowOperationsComponent) },
    ],
  },
  {
    path: 'store',
    loadComponent: () => import('./layout/storefront-layout/storefront-layout.component').then((m) => m.StorefrontLayoutComponent),
    children: [
      { path: '', redirectTo: 'product', pathMatch: 'full' },
      { path: 'product', loadComponent: () => import('./features/storefront/product/product').then((m) => m.ProductComponent) },
      { path: 'product/:id', loadComponent: () => import('./features/shared/product-detail-page/product-page.component').then((m) => m.ProductPageComponent) },
      { path: 'about', loadComponent: () => import('./features/storefront/about/about-page.component').then((m) => m.AboutPageComponent) },
      { path: 'orders', canActivate: [storefrontGuard], loadComponent: () => import('./features/storefront/orders/orders').then((m) => m.Orders) },
      { path: 'cart', loadComponent: () => import('./features/storefront/cart/cart-modal').then((m) => m.CartModalComponent) },
      { path: 'wishlist', canActivate: [storefrontGuard], loadComponent: () => import('./features/storefront/wishlist/wishlist.component').then((m) => m.WishlistComponent) },
      { path: 'custom-requests', canActivate: [customRequestMemberGuard], loadComponent: () => import('./features/storefront/custom-request/custom-request-list.component').then((m) => m.CustomRequestListComponent) },
      { path: 'custom-requests/:id', canActivate: [customRequestMemberGuard], loadComponent: () => import('./features/storefront/custom-request/custom-request-form.component').then((m) => m.CustomRequestFormComponent) },
      { path: 'custom-orders', canActivate: [storefrontGuard], loadComponent: () => import('./features/storefront/custom-orders/custom-orders.component').then((m) => m.CustomOrdersComponent) },
      { path: 'myinfor', canActivate: [storefrontGuard], loadComponent: () => import('./features/shared/myinfor/myinfor').then((m) => m.Myinfor) },
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
  {
    path: 'guest',
    loadComponent: () => import('./layout/storefront-layout/storefront-layout.component').then((m) => m.StorefrontLayoutComponent),
    children: [
      { path: 'orders/:id', loadComponent: () => import('./features/storefront/guest-order/guest-order.component').then((m) => m.GuestOrderComponent) },
    ],
  },
  { path: 'custom-orders', redirectTo: 'store/custom-orders', pathMatch: 'full' },
  { path: '', redirectTo: 'store/product', pathMatch: 'full' },
  { path: '**', redirectTo: 'store/product' },
];
