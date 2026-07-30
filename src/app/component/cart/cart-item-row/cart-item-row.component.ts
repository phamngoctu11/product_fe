import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CartItemRes } from '../../../model/cart.model';

@Component({
  selector: 'app-cart-item-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart-item-row.component.html',
  styleUrl: './cart-item-row.component.css',
})
export class CartItemRowComponent {
  @Input({ required: true }) item!: CartItemRes;
  @Input() quantity = 1;
  @Input() selected = false;
  @Input() owner = false;
  @Input() deleting = false;
  @Output() selectionToggle = new EventEmitter<number>();
  @Output() quantityDelta = new EventEmitter<number>();
  @Output() remove = new EventEmitter<number>();

  get itemId(): number {
    return Number(this.item.variantId || this.item.productId || 0);
  }

  get itemName(): string {
    return this.item.variantName || this.item.productName || `Sản phẩm #${this.itemId}`;
  }
}
