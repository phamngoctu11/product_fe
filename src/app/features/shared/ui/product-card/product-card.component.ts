import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Product } from '../../../../model/product.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Input() canEdit = false;
  @Input() canDelete = false;
  @Input() canPurchase = true;
  @Input() showFavorite = false;
  @Input() favorite = false;
  @Input() favoriteBusy = false;
  @Output() viewed = new EventEmitter<Product>();
  @Output() purchased = new EventEmitter<Product>();
  @Output() edited = new EventEmitter<Product>();
  @Output() deleted = new EventEmitter<Product>();
  @Output() favoriteToggled = new EventEmitter<Product>();

  get isAcceptingOrders(): boolean {
    const status = this.product?.availabilityStatus;
    return !status || status === 'ACCEPTING_ORDERS';
  }

  get isPaused(): boolean {
    return this.product?.availabilityStatus === 'PAUSED';
  }

  get isDiscontinued(): boolean {
    return this.product?.availabilityStatus === 'DISCONTINUED';
  }

  get availabilityLabel(): string {
    const status = this.product?.availabilityStatus;
    if (status === 'PAUSED') return 'Tạm ngưng nhận đơn';
    if (status === 'DISCONTINUED') return 'Ngừng kinh doanh';
    return 'Đang nhận đơn';
  }

  get isOutOfStock(): boolean {
    return !this.isAcceptingOrders;
  }

  open(): void {
    this.viewed.emit(this.product);
  }

  toggleFavorite(): void {
    if (!this.favoriteBusy) this.favoriteToggled.emit(this.product);
  }
}
