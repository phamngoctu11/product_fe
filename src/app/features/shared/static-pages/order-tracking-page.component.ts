import { Component } from '@angular/core'; import { RouterLink } from '@angular/router'; import { InfoPageShellComponent } from './info-page-shell.component';
@Component({selector:'app-order-tracking-page',standalone:true,imports:[InfoPageShellComponent,RouterLink],templateUrl:'./order-tracking-page.component.html'}) export class OrderTrackingPageComponent {}
