import { Routes } from '@angular/router';
import { LoginComponent } from './component/login/login';
import { UserComponent } from './component/user/user';
import { Orders } from './component/orders/orders';
import { Myinfor } from './component/myinfor/myinfor';
import { ProductComponent } from './component/product/product';
import { PaymentSuccessComponent } from './component/payment-success/payment-success';
import { AdminOrderComponent } from './component/admin-order/admin-order.component';
import { AdminDashboard } from './component/admin-dashboard/admin-dashboard';
import { AdminChatComponent } from './component/chat/admin_chat/admin-chat.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'product', component: ProductComponent },
  { path: 'user', component: UserComponent },
  { path: 'orders', component: Orders },
  { path: 'myinfor', component: Myinfor },
   { path: 'admin-orders', component: AdminOrderComponent },
  { path: 'payment-success', component: PaymentSuccessComponent },
  {
  path: 'admin-dashboard',
  component:AdminDashboard
},
{
  path: 'admin-chat',
  component:AdminChatComponent
}
];
