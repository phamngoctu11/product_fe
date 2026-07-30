import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { OrderListDTO } from '../../../model/order.model';
import { OrderStatusBadgeComponent } from '../order-status-badge/order-status-badge.component';

@Component({
  selector: 'app-order-summary-card',
  standalone: true,
  imports: [CommonModule, OrderStatusBadgeComponent],
  templateUrl: './order-summary-card.component.html',
  styleUrl: './order-summary-card.component.css',
})
export class OrderSummaryCardComponent {
  @Input({ required: true }) order!: OrderListDTO;
  @Input() clickable = true;
  @Input() showActions = false;
  @Input() showFooter = false;
  @Input() showStaff = true;
  @Output() selected = new EventEmitter<OrderListDTO>();

  selectOrder(): void {
    if (this.clickable) this.selected.emit(this.order);
  }
}
