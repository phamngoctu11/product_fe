import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Order, ReceiptConfirmResponse } from '../../model/order.model';
import {
  OrderItemsTableComponent,
  OrderStatusBadgeComponent,
  ViewStateComponent,
} from '../shared';
import type { OrderItemQuantityChange } from '../shared';

@Component({
  selector: 'app-order-detail-popup',
  standalone: true,
  imports: [CommonModule, FormsModule, OrderItemsTableComponent, OrderStatusBadgeComponent, ViewStateComponent],
  templateUrl: './order-detail-popup.component.html',
  styleUrl: './order-detail-popup.component.css',
})
export class OrderDetailPopupComponent {
  @Input() order: Order | null = null;
  @Input() isLoading = false;
  @Input() error = '';
  @Input() receiptMode = false;
  @Input() receivedQuantities: { [variantId: number]: number } = {};
  @Input() receiptResponse: ReceiptConfirmResponse | null = null;
  @Input() receiptError = '';
  @Input() isSubmittingReceipt = false;
  @Input() complaintNote = '';
  @Output() close = new EventEmitter<void>();
  @Output() submitReceipt = new EventEmitter<boolean>();
  @Output() sendComplaint = new EventEmitter<void>();
  @Output() complaintNoteChange = new EventEmitter<string>();

  get isVisible(): boolean {
    return this.isLoading || !!this.order || !!this.error;
  }

  updateReceivedQuantity(change: OrderItemQuantityChange): void {
    this.receivedQuantities[change.variantId] = change.quantity;
  }

  getOriginalTotal(order: Order): number {
    const items = order.items || order.orderItems || order.details || [];
    const itemTotal = items.reduce((total, item) => {
      const price = Number(item.price || 0);
      const quantity = Number(item.quantity || 0);
      return total + price * quantity;
    }, 0);

    if (itemTotal > 0) {
      return itemTotal;
    }
    return Number(order.totalPrice || 0);
  }

  getFinalTotal(order: Order): number {
    if (order.finalPrice !== null && order.finalPrice !== undefined) {
      return Number(order.finalPrice || 0);
    }
    return Math.max(0, this.getOriginalTotal(order) - Number(order.discountAmount || 0));
  }
}
