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
];
