import { Routes } from '@angular/router';
import { LoginComponent } from './component/login/login';
import { UserComponent } from './component/user/user';
import { Product } from './component/product/product';
import { Orders } from './component/orders/orders';
import { Myinfor } from './component/myinfor/myinfor';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'product', component: Product }, //
  { path: 'user', component: UserComponent },
  { path: 'orders', component: Orders },
  { path: 'myinfor', component: Myinfor }, //
];
