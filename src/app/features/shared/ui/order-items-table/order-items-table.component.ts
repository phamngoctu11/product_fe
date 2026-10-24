import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrderItem } from '../../../../model/order.model';

export type OrderItemsMode = 'readonly' | 'receipt';

export interface OrderItemQuantityChange {
  orderItemId?: number;
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

  get columnCount(): number {
    return this.isReceipt ? 6 : 5;
  }

  getOrderItemId(item: OrderItem): number {
    return Number(item.orderItemId || item.id || 0);
  }

  getVariantId(item: OrderItem): number {
    return Number(item.variantId || item.productVariantId || 0);
  }

  getQuantity(item: OrderItem): number {
    const orderItemId = this.getOrderItemId(item);
    const variantId = this.getVariantId(item);
    return Number(this.quantities[orderItemId] ?? this.quantities[variantId] ?? item.exportedQuantity ?? item.quantity ?? 0);
  }

  getImage(item: OrderItem): string {
    return item.imageUrl || item.image_url || '';
  }

  getVariantLabel(item: OrderItem): string {
    return item.attributes || (item.productVariantId ? `Variant #${item.productVariantId}` : 'Chưa có thuộc tính');
  }

  updateQuantity(item: OrderItem, value: number | string): void {
    const orderItemId = this.getOrderItemId(item);
    const variantId = this.getVariantId(item);
    this.quantityChange.emit({
      orderItemId,
      variantId,
      quantity: Math.max(0, Number(value || 0)),
    });
  }
}
