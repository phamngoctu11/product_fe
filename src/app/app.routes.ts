import { Routes } from '@angular/router';
import { LoginComponent } from './component/login/login';
import { UserComponent } from './component/user/user';
import { Product } from './component/product/product';
import { CartModalComponent } from './component/cart/cart-modal';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'product', component: Product }, //
  { path: 'user', component: UserComponent }, //
];
