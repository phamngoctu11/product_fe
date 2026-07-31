import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Product } from '../../../model/product.model';

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

  get isOutOfStock(): boolean {
    return !this.product.quantity || this.product.quantity <= 0;
  }

  open(): void {
    this.viewed.emit(this.product);
  }

  toggleFavorite(): void {
    if (!this.favoriteBusy) this.favoriteToggled.emit(this.product);
  }
}
