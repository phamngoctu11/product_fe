import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-view-state',
  standalone: true,
  templateUrl: './view-state.component.html',
  styleUrl: './view-state.component.css',
})
export class ViewStateComponent {
  @Input() loading = false;
  @Input() empty = false;
  @Input() error = '';
  @Input() loadingText = 'Đang tải dữ liệu...';
  @Input() emptyTitle = 'Chưa có dữ liệu';
  @Input() emptyText = '';
  @Input() emptyIcon = 'bi-inbox';
  @Input() card = true;
  @Input() actionLabel = '';
  @Input() actionIcon = 'bi-arrow-clockwise';
  @Output() action = new EventEmitter<void>();
}
