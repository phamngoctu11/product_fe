import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app-pagination.component.html',
  styleUrls: ['../../../app.css', './app-pagination.component.css'],
})
export class AppPaginationComponent {
  @Input() currentPage = 0;
  @Input() totalPages = 0;
  @Input() totalElements = 0;
  @Input() pageSize = 10;
  @Input() pageSizeOptions: number[] = [10, 20, 50, 100];
  @Input() disabled = false;
  @Input() showPageSize = true;
  @Input() compact = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get canShow(): boolean {
    return this.totalPages > 1 || this.totalElements > this.pageSize;
  }

  get startItem(): number {
    if (!this.totalElements) return 0;
    return this.currentPage * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
  }

  get visiblePages(): number[] {
    const total = Math.max(this.totalPages || 0, 0);
    if (total <= 0) return [];

    const current = Math.min(Math.max(this.currentPage, 0), total - 1);
    const radius = this.compact ? 1 : 2;
    const pages = new Set<number>([0, total - 1]);

    for (let page = current - radius; page <= current + radius; page += 1) {
      if (page >= 0 && page < total) pages.add(page);
    }

    return Array.from(pages).sort((a, b) => a - b);
  }

  shouldShowGap(index: number): boolean {
    return index > 0 && this.visiblePages[index] - this.visiblePages[index - 1] > 1;
  }

  goToPage(page: number): void {
    if (this.disabled || page === this.currentPage || page < 0 || page >= this.totalPages) return;
    this.pageChange.emit(page);
  }

  changePageSize(size: number | string): void {
    const nextSize = Number(size);
    if (this.disabled || !Number.isFinite(nextSize) || nextSize <= 0 || nextSize === this.pageSize) return;
    this.pageSizeChange.emit(nextSize);
  }
}
