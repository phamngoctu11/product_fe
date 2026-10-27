import { Component, Input } from '@angular/core';
import {
  DEFAULT_ORDER_STATUS_PRESENTATION,
  getOrderStatusLabel,
  ORDER_STATUS_PRESENTATION,
  OrderStatusPresentation,
} from './order-status.config';

@Component({
  selector: 'app-order-status-badge',
  standalone: true,
  templateUrl: './order-status-badge.component.html',
  styleUrl: './order-status-badge.component.css',
})
export class OrderStatusBadgeComponent {
  @Input({ required: true }) status = '';
  @Input() paymentStatus?: string | null;
  @Input() paymentMethod?: string | null;
  @Input() compact = false;

  get presentation(): OrderStatusPresentation {
    if (this.status === 'ORDER_ACCEPTED') {
      const pm = (this.paymentMethod || '').toUpperCase();
      const ps = (this.paymentStatus || '').toUpperCase();
      if (pm === 'ONLINE') {
        if (ps === 'PAID') {
          return { label: 'Đã thanh toán (Chờ sản xuất)', icon: 'bi-check-circle-fill', tone: 'success' };
        }
        return { label: 'Đã nhận đơn (Chờ thanh toán)', icon: 'bi-credit-card', tone: 'warning' };
      }
      if (pm === 'COD') {
        return { label: 'COD (Chờ sản xuất)', icon: 'bi-clock', tone: 'info' };
      }
    }
    if (this.status === 'CANCELLED') {
      const ps = (this.paymentStatus || '').toUpperCase();
      if (ps === 'EXPIRED' || ps === 'FAILED') {
        return { label: 'Đã hủy (Hết hạn thanh toán)', icon: 'bi-x-circle', tone: 'danger' };
      }
    }
    const fallback = {
      ...DEFAULT_ORDER_STATUS_PRESENTATION,
      label: getOrderStatusLabel(this.status),
    };
    return ORDER_STATUS_PRESENTATION[this.status] ?? fallback;
  }
}
