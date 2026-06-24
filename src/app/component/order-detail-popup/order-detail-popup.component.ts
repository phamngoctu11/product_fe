import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Order, OrderItem, ReceiptConfirmResponse } from '../../model/order.model';

@Component({
  selector: 'app-order-detail-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-detail-popup.component.html',
  styleUrls: ['../../app.css', './order-detail-popup.component.css'],
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

  getVariantId(item: OrderItem): number {
    return Number(item.variantId || item.productVariantId || 0);
  }

  getExpectedQuantity(item: OrderItem): number {
    return Number(item.exportedQuantity ?? item.quantity ?? 0);
  }
}
