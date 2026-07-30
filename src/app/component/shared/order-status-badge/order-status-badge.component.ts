import { Component, Input } from '@angular/core';
import {
  DEFAULT_ORDER_STATUS_PRESENTATION,
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
  @Input() compact = false;

  get presentation(): OrderStatusPresentation {
    const fallback = {
      ...DEFAULT_ORDER_STATUS_PRESENTATION,
      label: this.status || DEFAULT_ORDER_STATUS_PRESENTATION.label,
    };
    return ORDER_STATUS_PRESENTATION[this.status] ?? fallback;
  }
}
