import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { OrderItemProductionDTO, ProductionCheckpointDTO } from '../../../model/production-checkpoint.model';
import { ProductionCheckpointService } from '../../../service/production-checkpoint.service';

@Component({
  selector: 'app-customer-production-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customer-production-progress.component.html',
  styleUrl: './customer-production-progress.component.css',
})
export class CustomerProductionProgressComponent implements OnInit, OnChanges {
  @Input({ required: true }) orderId!: number;
  @Input() guestToken?: string | null = null;

  private readonly checkpointService = inject(ProductionCheckpointService);

  items: OrderItemProductionDTO[] = [];
  isLoading = false;
  loadError = '';
  enlargedImageUrl: string | null = null;

  ngOnInit(): void {
    if (this.orderId) {
      this.loadProgress();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['orderId'] && !changes['orderId'].firstChange) ||
      (changes['guestToken'] && !changes['guestToken'].firstChange)
    ) {
      this.loadProgress();
    }
  }

  loadProgress(): void {
    if (!this.orderId) return;
    this.isLoading = true;
    this.loadError = '';

    const stream$ = this.guestToken
      ? this.checkpointService.getGuestProgress(this.orderId, this.guestToken)
      : this.checkpointService.getProgress(this.orderId);

    stream$.subscribe({
      next: (items) => {
        this.items = items || [];
        this.isLoading = false;
      },
      error: (error) => {
        this.items = [];
        this.loadError = error?.status === 403
          ? 'Bạn không có quyền xem tiến trình sản xuất của đơn hàng này.'
          : 'Không thể tải tiến trình sản xuất. Vui lòng thử lại.';
        this.isLoading = false;
      },
    });
  }

  getVisibleCheckpoints(item: OrderItemProductionDTO): ProductionCheckpointDTO[] {
    return [...(item.checkpoints || [])]
      .filter((checkpoint) => checkpoint.stage === 'INITIAL_SHAPE' || checkpoint.stage === 'FINAL_PRODUCT')
      .sort((left, right) => new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime());
  }

  checkpointStageLabel(checkpoint: ProductionCheckpointDTO): string {
    return checkpoint.stage === 'INITIAL_SHAPE' ? 'Tạo dáng ban đầu' : 'Sản phẩm hoàn thiện';
  }

  checkpointStatusLabel(checkpoint: ProductionCheckpointDTO): string {
    switch (checkpoint.status) {
      case 'PASSED': return 'Đã hoàn tất bước này';
      case 'PENDING_REVIEW': return 'Đang chờ kiểm tra chất lượng';
      case 'REWORK_REQUIRED': return 'Đang hoàn thiện lại';
      default: return 'Đang cập nhật';
    }
  }

  productionStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      NOT_REQUIRED: 'Không cần cập nhật tiến độ',
      WAITING_ASSIGNMENT: 'Đang chờ phân công',
      ASSIGNED: 'Đã có người phụ trách',
      INITIAL_IN_PROGRESS: 'Đang tạo dáng ban đầu',
      FINAL_IN_PROGRESS: 'Đang hoàn thiện sản phẩm',
      FINAL_WAITING_QC: 'Đang chờ kiểm tra chất lượng',
      FINAL_REWORK_REQUIRED: 'Đang hoàn thiện lại',
      READY: 'Đã hoàn tất chế tác',
    };
    return labels[status] || 'Đang cập nhật tiến độ';
  }

  canShowCheckpointImages(checkpoint: ProductionCheckpointDTO): boolean {
    return checkpoint.status === 'PASSED';
  }

  canShowCheckpointNote(checkpoint: ProductionCheckpointDTO): boolean {
    return checkpoint.stage === 'INITIAL_SHAPE' || checkpoint.status === 'PASSED';
  }

  openImageModal(url: string): void {
    this.enlargedImageUrl = url;
  }

  closeImageModal(): void {
    this.enlargedImageUrl = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeImageModal();
  }
}
