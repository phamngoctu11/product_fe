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
}
