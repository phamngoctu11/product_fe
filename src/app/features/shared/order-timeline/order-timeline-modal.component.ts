import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { OrderStatusHistory } from '../../../model/order.model';
import { getOrderStatusLabel } from '../ui/order-status-badge/order-status.config';

@Component({
  selector: 'app-order-timeline-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="open">
      <div class="modal-backdrop fade show order-timeline-backdrop" aria-hidden="true"></div>
      <div
        class="modal fade show order-timeline-modal"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="orderTimelineTitle"
        [style.display]="open ? 'block' : 'none'"
        (click)="close()"
      >
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" (click)="$event.stopPropagation()">
          <div class="modal-content order-timeline-content overflow-hidden">
            <div class="modal-header order-timeline-header">
              <h5 id="orderTimelineTitle" class="modal-title fw-bold">
                <i class="bi bi-clock-history me-2" aria-hidden="true"></i>
                Tiến trình đơn hàng #{{ orderId }}
              </h5>
              <button type="button" class="btn-close btn-close-white clay-close-button" aria-label="Đóng lịch sử đơn hàng" (click)="close()"></button>
            </div>
            <div class="modal-body order-timeline-body">
              <div *ngIf="loading" class="text-center text-muted py-4">
                <div class="spinner-border text-info mb-2" role="status" aria-label="Đang tải"></div>
                <p>Đang tải dữ liệu...</p>
              </div>

              <div *ngIf="!loading && history.length === 0" class="text-center text-muted py-4">
                Chưa có lịch sử trạng thái cho đơn hàng này.
              </div>

              <ul *ngIf="!loading && history.length > 0" class="timeline">
                <li
                  *ngFor="let step of history; let i = index"
                  class="timeline-item"
                  [class.completed]="step.newstatus === 'DELIVERED'"
                  [class.cancelled]="step.newstatus === 'CANCELLED'"
                  [class.active]="i === history.length - 1 && step.newstatus !== 'DELIVERED' && step.newstatus !== 'CANCELLED'"
                >
                  <div class="fw-bold fs-6" [ngClass]="{'text-danger': step.newstatus === 'CANCELLED', 'text-success': step.newstatus === 'DELIVERED'}">
                    {{ statusLabel(step.newstatus) }}
                  </div>
                  <div class="timeline-date">
                    <i class="bi bi-calendar3 me-1" aria-hidden="true"></i>
                    {{ step.updatetime | date:'dd/MM/yyyy HH:mm:ss' }}
                  </div>
                  <div class="timeline-previous-status" *ngIf="step.oldstatus">
                    <i class="bi bi-arrow-return-right me-1" aria-hidden="true"></i>
                    Trước đó: {{ statusLabel(step.oldstatus) }}
                  </div>
                </li>
              </ul>
            </div>
            <div class="modal-footer order-timeline-footer">
              <button type="button" class="btn btn-secondary px-4 fw-bold" (click)="close()">Đóng</button>
            </div>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styleUrl: './order-timeline-modal.component.css',
})
export class OrderTimelineModalComponent {
  @Input() open = false;
  @Input() orderId: number | null = null;
  @Input() history: OrderStatusHistory[] = [];
  @Input() loading = false;
  @Output() closed = new EventEmitter<void>();

  statusLabel(status: string | null | undefined): string {
    return getOrderStatusLabel(status);
  }

  close(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape', ['$event'])
  closeOnEscape(event: Event): void {
    if (!this.open) return;
    event.preventDefault();
    this.close();
  }
}
