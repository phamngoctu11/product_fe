import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InfoPageShellComponent } from './info-page-shell.component';
@Component({selector:'app-shopping-guide-page',standalone:true,imports:[InfoPageShellComponent,RouterLink],templateUrl:'./shopping-guide-page.component.html'})
export class ShoppingGuidePageComponent {}
