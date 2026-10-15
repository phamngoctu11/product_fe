import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { getApiErrorMessage } from '../../../model/api-response.model';
import {
  OrderItemProductionDTO,
  ProductionCheckpointDTO,
  ReviewProductionCheckpointResultDTO,
} from '../../../model/production-checkpoint.model';
import { ProductionCheckpointService } from '../../../service/production-checkpoint.service';
import { ToastService } from '../../../service/toast.service';

@Component({
  selector: 'app-manager-kcs-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manager-kcs-dialog.component.html',
  styleUrl: './manager-kcs-dialog.component.css',
})
export class ManagerKcsDialogComponent implements OnChanges {
  private readonly checkpointService = inject(ProductionCheckpointService);
  private readonly toast = inject(ToastService);

  @Input() orderId: number | null = null;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() reviewed = new EventEmitter<ReviewProductionCheckpointResultDTO>();

  itemsProgress: OrderItemProductionDTO[] = [];
  isLoading = false;
  errorMessage = '';

  submittingCheckpointId: number | null = null;
  reworkReasons: Record<number, string> = {};
  showReworkForm: Record<number, boolean> = {};

  // Idempotency key map per checkpointId
  private idempotencyKeys = new Map<string, string>();

  // Preview / Lightbox
  lightboxImageUrl: string | null = null;

  // Last review result banner
  lastReviewResult: ReviewProductionCheckpointResultDTO | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['orderId'] || changes['isOpen']) && this.isOpen && this.orderId) {
      this.lastReviewResult = null;
      this.loadProgress();
    }
  }

  loadProgress(): void {
    if (!this.orderId) return;
    this.isLoading = true;
    this.errorMessage = '';

    this.checkpointService.getProgress(this.orderId).subscribe({
      next: (items) => {
        this.itemsProgress = items || [];
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = getApiErrorMessage(err, 'Không thể tải tiến độ sản xuất của đơn hàng.');
        this.isLoading = false;
      },
    });
  }

  getPendingReviewCheckpoint(item: OrderItemProductionDTO): ProductionCheckpointDTO | null {
    if (!item.checkpoints || item.checkpoints.length === 0) return null;
    return (
      item.checkpoints.find(
        (cp) => cp.stage === 'FINAL_PRODUCT' && cp.status === 'PENDING_REVIEW'
      ) || null
    );
  }

  getPendingCount(): number {
    return this.itemsProgress.reduce((acc, item) => {
      const hasPending = (item.checkpoints || []).some(
        (cp) => cp.stage === 'FINAL_PRODUCT' && cp.status === 'PENDING_REVIEW'
      );
      return acc + (hasPending ? 1 : 0);
    }, 0);
  }

  toggleReworkForm(checkpointId: number): void {
    this.showReworkForm[checkpointId] = !this.showReworkForm[checkpointId];
    if (!this.reworkReasons[checkpointId]) {
      this.reworkReasons[checkpointId] = '';
    }
  }

  passCheckpoint(checkpoint: ProductionCheckpointDTO): void {
    if (!this.orderId || this.submittingCheckpointId !== null) return;

    const key = this.getOrCreateKey(checkpoint.id, 'PASS');
    this.submittingCheckpointId = checkpoint.id;

    this.checkpointService
      .reviewCheckpoint(
        this.orderId,
        checkpoint.id,
        {
          checkpointVersion: checkpoint.version,
          decision: 'PASS',
          reason: undefined,
        },
        key
      )
      .subscribe({
        next: (result) => {
          this.submittingCheckpointId = null;
          this.idempotencyKeys.delete(this.operationKey(checkpoint.id, 'PASS'));
          this.lastReviewResult = result;

          if (result.orderStatus === 'READY_TO_SHIP') {
            this.toast.notify(
              `Đã duyệt đạt KCS! Tất cả sản phẩm đã hoàn tất, đơn hàng #${this.orderId} chuyển sang READY_TO_SHIP.`
            );
          } else {
            this.toast.notify(
              `Đã duyệt đạt KCS cho sản phẩm. Còn ${result.remainingOrderItemIds?.length ?? 0} sản phẩm chưa hoàn tất.`
            );
          }

          this.reviewed.emit(result);
          this.loadProgress();
        },
        error: (err) => {
          this.submittingCheckpointId = null;
          this.handleReviewError(err);
        },
      });
  }

  confirmRework(checkpoint: ProductionCheckpointDTO): void {
    if (!this.orderId || this.submittingCheckpointId !== null) return;

    const reason = (this.reworkReasons[checkpoint.id] || '').trim();
    if (!reason) {
      this.toast.notify('Vui lòng nhập lý do yêu cầu làm lại.');
      return;
    }

    if (reason.length > 1000) {
      this.toast.notify('Lý do yêu cầu làm lại không được vượt quá 1000 ký tự.');
      return;
    }

    const key = this.getOrCreateKey(checkpoint.id, 'REWORK');
    this.submittingCheckpointId = checkpoint.id;

    this.checkpointService
      .reviewCheckpoint(
        this.orderId,
        checkpoint.id,
        {
          checkpointVersion: checkpoint.version,
          decision: 'REWORK_REQUIRED',
          reason,
        },
        key
      )
      .subscribe({
        next: (result) => {
          this.submittingCheckpointId = null;
          this.idempotencyKeys.delete(this.operationKey(checkpoint.id, 'REWORK'));
          this.showReworkForm[checkpoint.id] = false;
          this.reworkReasons[checkpoint.id] = '';
          this.lastReviewResult = result;

          this.toast.notify(`Đã gửi yêu cầu làm lại cho sản phẩm.`);
          this.reviewed.emit(result);
          this.loadProgress();
        },
        error: (err) => {
          this.submittingCheckpointId = null;
          this.handleReviewError(err);
        },
      });
  }

  private handleReviewError(err: any): void {
    if (err?.status === 409) {
      this.toast.notify(
        'Dữ liệu checkpoint đã thay đổi hoặc đang được xử lý, đang làm mới dữ liệu...'
      );
      this.loadProgress();
    } else if (err?.status === 403) {
      this.toast.notify('Bạn không có quyền duyệt KCS cho đơn hàng này.');
      this.onClose();
    } else {
      this.toast.notify(
        'Không thể duyệt KCS: ' + getApiErrorMessage(err, 'Vui lòng thử lại.')
      );
    }
  }

  private getOrCreateKey(checkpointId: number, action: string): string {
    const operationKey = this.operationKey(checkpointId, action);
    if (!this.idempotencyKeys.has(operationKey)) {
      const uuid = this.checkpointService.generateIdempotencyKey(
        `kcs-${action.toLowerCase()}`,
        checkpointId
      );
      this.idempotencyKeys.set(operationKey, uuid);
    }
    return this.idempotencyKeys.get(operationKey)!;
  }

  private operationKey(checkpointId: number, action: string): string {
    return `${checkpointId}:${action}`;
  }

  openLightbox(url: string): void {
    this.lightboxImageUrl = url;
  }

  closeLightbox(): void {
    this.lightboxImageUrl = null;
  }

  onClose(): void {
    this.close.emit();
  }

  getItemStatusBadgeClass(status: string): string {
    switch (status) {
      case 'READY':
        return 'badge-success';
      case 'FINAL_WAITING_QC':
        return 'badge-warning';
      case 'FINAL_REWORK_REQUIRED':
        return 'badge-danger';
      case 'FINAL_IN_PROGRESS':
      case 'INITIAL_IN_PROGRESS':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  }

  getItemStatusLabel(status: string): string {
    switch (status) {
      case 'WAITING_ASSIGNMENT':
        return 'Chờ phân công';
      case 'ASSIGNED':
        return 'Đã phân công';
      case 'INITIAL_IN_PROGRESS':
        return 'Đang tạo dáng ban đầu';
      case 'FINAL_IN_PROGRESS':
        return 'Đang làm sản phẩm hoàn thiện';
      case 'FINAL_WAITING_QC':
        return 'Chờ KCS kiểm định';
      case 'FINAL_REWORK_REQUIRED':
        return 'Cần làm lại theo yêu cầu KCS';
      case 'READY':
        return 'Đã đạt chuẩn KCS';
      default:
        return status;
    }
  }
}
