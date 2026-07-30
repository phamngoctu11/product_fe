import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrderItem } from '../../../model/order.model';

export type OrderItemsMode = 'readonly' | 'receipt' | 'warehouse';

export interface OrderItemQuantityChange {
  variantId: number;
  quantity: number;
}

@Component({
  selector: 'app-order-items-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-items-table.component.html',
  styleUrl: './order-items-table.component.css',
})
export class OrderItemsTableComponent {
  @Input() items: readonly OrderItem[] = [];
  @Input() mode: OrderItemsMode = 'readonly';
  @Input() quantities: Readonly<Record<number, number>> = {};
  @Input() editable = true;
  @Output() quantityChange = new EventEmitter<OrderItemQuantityChange>();

  get isReceipt(): boolean {
    return this.mode === 'receipt';
  }

  get isWarehouse(): boolean {
    return this.mode === 'warehouse';
  }

  get columnCount(): number {
    if (this.isWarehouse) return 4;
    return this.isReceipt ? 8 : 7;
  }

  getVariantId(item: OrderItem): number {
    return Number(item.variantId || item.productVariantId || 0);
  }

  getQuantity(item: OrderItem): number {
    const variantId = this.getVariantId(item);
    return Number(this.quantities[variantId] ?? item.exportedQuantity ?? item.quantity ?? 0);
  }

  getImage(item: OrderItem): string {
    return item.imageUrl || item.image_url || '';
  }

  getVariantLabel(item: OrderItem): string {
    return item.attributes || (item.productVariantId ? `Variant #${item.productVariantId}` : 'Chưa có thuộc tính');
  }

  updateQuantity(item: OrderItem, value: number | string): void {
    this.quantityChange.emit({
      variantId: this.getVariantId(item),
      quantity: Math.max(0, Number(value || 0)),
    });
  }
}
