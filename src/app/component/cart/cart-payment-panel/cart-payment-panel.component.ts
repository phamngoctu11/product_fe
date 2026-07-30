import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CartPaymentData } from '../../../model/cart.model';

@Component({
  selector: 'app-cart-payment-panel',
  standalone: true,
  templateUrl: './cart-payment-panel.component.html',
  styleUrl: './cart-payment-panel.component.css',
})
export class CartPaymentPanelComponent {
  @Input({ required: true }) payment!: CartPaymentData;
  @Input() qrDataUrl = '';
  @Input() generatingQr = false;
  @Output() openPayment = new EventEmitter<void>();
  @Output() openDeeplink = new EventEmitter<void>();

  get paymentUrl(): string {
    return this.payment.payUrl || this.payment.url || '';
  }
}
