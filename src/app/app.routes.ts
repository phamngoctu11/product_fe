import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./component/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'product',
    loadComponent: () => import('./component/product/product').then((m) => m.ProductComponent),
  },
  {
    path: 'product/:id',
    loadComponent: () =>
      import('./component/product-page/product-page.component').then((m) => m.ProductPageComponent),
  },
  {
    path: 'user',
    loadComponent: () => import('./component/user/user').then((m) => m.UserComponent),
  },
  {
    path: 'orders',
    loadComponent: () => import('./component/orders/orders').then((m) => m.Orders),
  },
  {
    path: 'staff-orders',
    loadComponent: () =>
      import('./component/staff-orders/staff-orders.component').then((m) => m.StaffOrdersComponent),
  },
  {
    path: 'myinfor',
    loadComponent: () => import('./component/myinfor/myinfor').then((m) => m.Myinfor),
  },
  {
    path: 'admin-orders',
    loadComponent: () =>
      import('./component/admin-order/admin-order.component').then((m) => m.AdminOrderComponent),
  },
  {
    path: 'admin-dashboard',
    loadComponent: () =>
      import('./component/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
  },
  {
    path: 'admin-chat',
    loadComponent: () =>
      import('./component/chat/admin_chat/admin-chat.component').then((m) => m.AdminChatComponent),
  },
  {
    path: 'admin-vouchers',
    loadComponent: () =>
      import('./component/voucher-admin/voucher-admin.component').then((m) => m.VoucherAdminComponent),
  },
  {
    path: 'payment-success',
    loadComponent: () =>
      import('./component/payment-success/payment-success').then((m) => m.PaymentSuccessComponent),
  },
  {
    path: 'help/shopping-guide',
    loadComponent: () => import('./component/static-pages/shopping-guide-page.component').then((m) => m.ShoppingGuidePageComponent),
  },
  {
    path: 'help/order-tracking',
    loadComponent: () => import('./component/static-pages/order-tracking-page.component').then((m) => m.OrderTrackingPageComponent),
  },
  {
    path: 'help/payment-methods',
    loadComponent: () => import('./component/static-pages/payment-methods-page.component').then((m) => m.PaymentMethodsPageComponent),
  },
  {
    path: 'help/contact-support',
    loadComponent: () => import('./component/static-pages/contact-support-page.component').then((m) => m.ContactSupportPageComponent),
  },
  {
    path: 'policies/shipping',
    loadComponent: () => import('./component/static-pages/shipping-policy-page.component').then((m) => m.ShippingPolicyPageComponent),
  },
  {
    path: 'policies/returns-refunds',
    loadComponent: () => import('./component/static-pages/returns-refunds-page.component').then((m) => m.ReturnsRefundsPageComponent),
  },
  {
    path: 'policies/warranty',
    loadComponent: () => import('./component/static-pages/warranty-policy-page.component').then((m) => m.WarrantyPolicyPageComponent),
  },
  {
    path: 'policies/privacy',
    loadComponent: () => import('./component/static-pages/privacy-policy-page.component').then((m) => m.PrivacyPolicyPageComponent),
  },
];
