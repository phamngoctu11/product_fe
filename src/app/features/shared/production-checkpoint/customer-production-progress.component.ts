import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
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

  getInitialShapeCheckpoint(item: OrderItemProductionDTO): ProductionCheckpointDTO | undefined {
    return (item.checkpoints || []).find((c) => c.stage === 'INITIAL_SHAPE');
  }

  openImageModal(url: string): void {
    this.enlargedImageUrl = url;
  }

  closeImageModal(): void {
    this.enlargedImageUrl = null;
  }
}
