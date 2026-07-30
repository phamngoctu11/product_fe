import { Routes } from '@angular/router';
import { ROUTE_ACCESS } from './config/navigation.config';
import { authGuard } from './guard/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./component/login/login').then((module) => module.LoginComponent),
  },
  {
    path: '',
    canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: 'product', pathMatch: 'full' },
      {
        path: 'product',
        loadComponent: () => import('./component/product/product').then((module) => module.ProductComponent),
      },
      {
        path: 'product/:id',
        loadComponent: () => import('./component/product-page/product-page.component').then((module) => module.ProductPageComponent),
      },
      {
        path: 'user',
        data: { roles: ROUTE_ACCESS.management },
        loadComponent: () => import('./component/user/user').then((module) => module.UserComponent),
      },
      {
        path: 'orders',
        loadComponent: () => import('./component/orders/orders').then((module) => module.Orders),
      },
      {
        path: 'consultations',
        data: { roles: ROUTE_ACCESS.customer },
        loadComponent: () => import('./component/consultations/user-consultations.component').then((module) => module.UserConsultationsComponent),
      },
      {
        path: 'staff-orders',
        data: { roles: ROUTE_ACCESS.staff },
        loadComponent: () => import('./component/staff-orders/staff-orders.component').then((module) => module.StaffOrdersComponent),
      },
      {
        path: 'commissions',
        data: { roles: ROUTE_ACCESS.operations },
        loadComponent: () => import('./component/commissions/consultation-commissions.component').then((module) => module.ConsultationCommissionsComponent),
      },
      {
        path: 'myinfor',
        loadComponent: () => import('./component/myinfor/myinfor').then((module) => module.Myinfor),
      },
      {
        path: 'admin-orders',
        data: { roles: ROUTE_ACCESS.management },
        loadComponent: () => import('./component/admin-order/admin-order.component').then((module) => module.AdminOrderComponent),
      },
      {
        path: 'admin-dashboard',
        data: { roles: ROUTE_ACCESS.management },
        loadComponent: () => import('./component/admin-dashboard/admin-dashboard').then((module) => module.AdminDashboard),
      },
      {
        path: 'admin-chat',
        data: { roles: ROUTE_ACCESS.operations },
        loadComponent: () => import('./component/chat/admin_chat/admin-chat.component').then((module) => module.AdminChatComponent),
      },
      {
        path: 'admin-vouchers',
        data: { roles: ROUTE_ACCESS.management },
        loadComponent: () => import('./component/voucher-admin/voucher-admin.component').then((module) => module.VoucherAdminComponent),
      },
      {
        path: 'payment-success',
        loadComponent: () => import('./component/payment-success/payment-success').then((module) => module.PaymentSuccessComponent),
      },
      {
        path: 'help/shopping-guide',
        loadComponent: () => import('./component/static-pages/shopping-guide-page.component').then((module) => module.ShoppingGuidePageComponent),
      },
      {
        path: 'help/order-tracking',
        loadComponent: () => import('./component/static-pages/order-tracking-page.component').then((module) => module.OrderTrackingPageComponent),
      },
      {
        path: 'help/payment-methods',
        loadComponent: () => import('./component/static-pages/payment-methods-page.component').then((module) => module.PaymentMethodsPageComponent),
      },
      {
        path: 'help/contact-support',
        loadComponent: () => import('./component/static-pages/contact-support-page.component').then((module) => module.ContactSupportPageComponent),
      },
      {
        path: 'policies/shipping',
        loadComponent: () => import('./component/static-pages/shipping-policy-page.component').then((module) => module.ShippingPolicyPageComponent),
      },
      {
        path: 'policies/returns-refunds',
        loadComponent: () => import('./component/static-pages/returns-refunds-page.component').then((module) => module.ReturnsRefundsPageComponent),
      },
      {
        path: 'policies/warranty',
        loadComponent: () => import('./component/static-pages/warranty-policy-page.component').then((module) => module.WarrantyPolicyPageComponent),
      },
      {
        path: 'policies/privacy',
        loadComponent: () => import('./component/static-pages/privacy-policy-page.component').then((module) => module.PrivacyPolicyPageComponent),
      },
    ],
  },
];
