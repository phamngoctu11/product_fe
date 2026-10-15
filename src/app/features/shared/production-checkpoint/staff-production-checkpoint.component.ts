import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { getApiErrorMessage } from '../../../model/api-response.model';
import {
  OrderItemProductionDTO,
  ProductionCheckpointDTO,
  SubmitProductionCheckpointRequest,
} from '../../../model/production-checkpoint.model';
import { ProductionCheckpointService } from '../../../service/production-checkpoint.service';
import { ToastService } from '../../../service/toast.service';

@Component({
  selector: 'app-staff-production-checkpoint',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-production-checkpoint.component.html',
  styleUrl: './staff-production-checkpoint.component.css',
})
export class StaffProductionCheckpointComponent implements OnInit, OnChanges {
  @Input({ required: true }) orderId!: number;
  @Input() orderVersion: number = 0;
  @Input() readOnly = false;
  @Output() orderUpdated = new EventEmitter<void>();

  private readonly checkpointService = inject(ProductionCheckpointService);
  private readonly toast = inject(ToastService);

  items: OrderItemProductionDTO[] = [];
  isLoading = false;
  loadError = '';
  accessDenied = false;

  // Quản lý form nộp INITIAL_SHAPE theo orderItemId
  initialFiles: Record<number, File[]> = {};
  initialPreviews: Record<number, string[]> = {};
  initialNotes: Record<number, string> = {};
  isUploadingInitial: Record<number, boolean> = {};
  isSubmittingInitial: Record<number, boolean> = {};
  private initialIdempotencyKeys: Record<number, string> = {};
  private initialPendingPayloads: Record<number, SubmitProductionCheckpointRequest> = {};

  // Quản lý form nộp FINAL_PRODUCT theo orderItemId
  finalFiles: Record<number, File[]> = {};
  finalPreviews: Record<number, string[]> = {};
  finalNotes: Record<number, string> = {};
  isUploadingFinal: Record<number, boolean> = {};
  isSubmittingFinal: Record<number, boolean> = {};
  private finalIdempotencyKeys: Record<number, string> = {};
  private finalPendingPayloads: Record<number, SubmitProductionCheckpointRequest> = {};

  // Modal xem ảnh phóng to
  enlargedImageUrl: string | null = null;

  ngOnInit(): void {
    if (this.orderId) {
      this.loadProgress();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['orderId'] && !changes['orderId'].firstChange) {
      this.loadProgress();
    }
  }

  loadProgress(): void {
    if (!this.orderId) return;
    this.isLoading = true;
    this.loadError = '';
    this.accessDenied = false;
    this.checkpointService.getProgress(this.orderId).subscribe({
      next: (items) => {
        this.items = items || [];
        this.isLoading = false;
      },
      error: (err) => {
        this.loadError = getApiErrorMessage(err, 'Không thể tải tiến trình sản xuất.');
        this.accessDenied = err?.status === 403;
        this.isLoading = false;
      },
    });
  }

  getInitialShapeCheckpoint(item: OrderItemProductionDTO): ProductionCheckpointDTO | undefined {
    return (item.checkpoints || []).find((c) => c.stage === 'INITIAL_SHAPE');
  }

  getFinalCheckpoints(item: OrderItemProductionDTO): ProductionCheckpointDTO[] {
    return (item.checkpoints || [])
      .filter((c) => c.stage === 'FINAL_PRODUCT')
      .sort((a, b) => a.attemptNumber - b.attemptNumber);
  }

  getLatestFinalCheckpoint(item: OrderItemProductionDTO): ProductionCheckpointDTO | undefined {
    const finals = this.getFinalCheckpoints(item);
    return finals.length > 0 ? finals[finals.length - 1] : undefined;
  }

  isInitialCompleted(item: OrderItemProductionDTO): boolean {
    const initial = this.getInitialShapeCheckpoint(item);
    return !!initial && initial.status === 'PASSED';
  }

  canSubmitFinal(item: OrderItemProductionDTO): boolean {
    if (this.readOnly || this.accessDenied || !this.isInitialCompleted(item)) return false;
    const latest = this.getLatestFinalCheckpoint(item);
    if (!latest) return true; // Chưa có attempt nào
    return latest.status === 'REWORK_REQUIRED'; // Latest đã bị yêu cầu làm lại
  }

  isFinalPendingReview(item: OrderItemProductionDTO): boolean {
    const latest = this.getLatestFinalCheckpoint(item);
    return !!latest && latest.status === 'PENDING_REVIEW';
  }

  isFinalPassed(item: OrderItemProductionDTO): boolean {
    const latest = this.getLatestFinalCheckpoint(item);
    return !!latest && latest.status === 'PASSED';
  }

  getNextFinalAttemptNumber(item: OrderItemProductionDTO): number {
    const finals = this.getFinalCheckpoints(item);
    return finals.length + 1;
  }

  // --- Xử lý chọn ảnh INITIAL_SHAPE ---
  onSelectInitialFiles(event: Event, itemId: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const currentFiles = this.initialFiles[itemId] || [];
    const newFiles = Array.from(input.files);
    const combined = [...currentFiles, ...newFiles].slice(0, 10);
    this.initialFiles[itemId] = combined;
    this.generatePreviews(combined, (previews) => {
      this.initialPreviews[itemId] = previews;
    });
    input.value = '';
  }

  removeInitialFile(itemId: number, index: number): void {
    const current = this.initialFiles[itemId] || [];
    current.splice(index, 1);
    this.initialFiles[itemId] = [...current];
    this.generatePreviews(this.initialFiles[itemId], (previews) => {
      this.initialPreviews[itemId] = previews;
    });
  }

  // --- Xử lý chọn ảnh FINAL_PRODUCT ---
  onSelectFinalFiles(event: Event, itemId: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const currentFiles = this.finalFiles[itemId] || [];
    const newFiles = Array.from(input.files);
    const combined = [...currentFiles, ...newFiles].slice(0, 10);
    this.finalFiles[itemId] = combined;
    this.generatePreviews(combined, (previews) => {
      this.finalPreviews[itemId] = previews;
    });
    input.value = '';
  }

  removeFinalFile(itemId: number, index: number): void {
    const current = this.finalFiles[itemId] || [];
    current.splice(index, 1);
    this.finalFiles[itemId] = [...current];
    this.generatePreviews(this.finalFiles[itemId], (previews) => {
      this.finalPreviews[itemId] = previews;
    });
  }

  private generatePreviews(files: File[], callback: (previews: string[]) => void): void {
    if (files.length === 0) {
      callback([]);
      return;
    }
    const previews: string[] = [];
    let loaded = 0;
    files.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        previews[idx] = (e.target?.result as string) || '';
        loaded++;
        if (loaded === files.length) {
          callback(previews);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // --- Submit INITIAL_SHAPE ---
  submitInitialShape(item: OrderItemProductionDTO): void {
    const itemId = item.orderItemId;
    if (
      this.readOnly ||
      this.accessDenied ||
      this.isUploadingInitial[itemId] ||
      this.isSubmittingInitial[itemId]
    ) return;

    const files = this.initialFiles[itemId] || [];
    if (files.length === 0) {
      this.toast.notify('Vui lòng chọn ít nhất 1 hình ảnh tạo dáng ban đầu.');
      return;
    }
    if (files.length > 10) {
      this.toast.notify('Tối đa 10 hình ảnh cho mỗi lần nộp.');
      return;
    }

    if (!this.initialIdempotencyKeys[itemId]) {
      this.initialIdempotencyKeys[itemId] = this.checkpointService.generateIdempotencyKey();
    }
    const key = this.initialIdempotencyKeys[itemId];

    const pendingPayload = this.initialPendingPayloads[itemId];
    if (pendingPayload) {
      this.sendInitialCheckpoint(itemId, pendingPayload, key);
      return;
    }

    this.isUploadingInitial[itemId] = true;
    this.checkpointService.uploadImages(files).subscribe({
      next: (imageUrls) => {
        this.isUploadingInitial[itemId] = false;
        this.isSubmittingInitial[itemId] = true;

        const payload: SubmitProductionCheckpointRequest = {
          orderVersion: this.orderVersion,
          stage: 'INITIAL_SHAPE',
          imageUrls,
          note: (this.initialNotes[itemId] || '').trim(),
        };
        this.initialPendingPayloads[itemId] = payload;
        this.sendInitialCheckpoint(itemId, payload, key);
      },
      error: (err) => {
        this.isUploadingInitial[itemId] = false;
        this.toast.notify('Lỗi tải ảnh lên hệ thống: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
      },
    });
  }

  private sendInitialCheckpoint(
    itemId: number,
    payload: SubmitProductionCheckpointRequest,
    idempotencyKey: string,
  ): void {
    this.isSubmittingInitial[itemId] = true;
    this.checkpointService.submitCheckpoint(this.orderId, itemId, payload, idempotencyKey).subscribe({
      next: () => {
        this.isSubmittingInitial[itemId] = false;
        this.initialFiles[itemId] = [];
        this.initialPreviews[itemId] = [];
        this.initialNotes[itemId] = '';
        delete this.initialIdempotencyKeys[itemId];
        delete this.initialPendingPayloads[itemId];

        this.toast.notify('Đã gửi báo cáo tạo dáng ban đầu thành công! Tiến trình đã được gửi tới khách hàng.');
        this.orderUpdated.emit();
        this.loadProgress();
      },
      error: (err) => {
        this.isSubmittingInitial[itemId] = false;
        if (err?.status === 409) {
          delete this.initialIdempotencyKeys[itemId];
          delete this.initialPendingPayloads[itemId];
          this.toast.notify('Dữ liệu đã thay đổi (409). Đang tải lại thông tin mới nhất...');
          this.orderUpdated.emit();
          this.loadProgress();
        } else if (err?.status === 403) {
          delete this.initialIdempotencyKeys[itemId];
          delete this.initialPendingPayloads[itemId];
          this.accessDenied = true;
          this.toast.notify('Bạn không còn quyền cập nhật đơn hàng này. Đang làm mới danh sách được phân công...');
          this.orderUpdated.emit();
        } else {
          this.toast.notify('Không thể gửi checkpoint tạo dáng: ' + getApiErrorMessage(err, 'Vui lòng kiểm tra lại. Bạn có thể thử gửi lại mà không cần tải ảnh lần nữa.'));
        }
      },
    });
  }

  // --- Submit FINAL_PRODUCT ---
  submitFinalProduct(item: OrderItemProductionDTO): void {
    const itemId = item.orderItemId;
    if (
      this.readOnly ||
      this.accessDenied ||
      this.isUploadingFinal[itemId] ||
      this.isSubmittingFinal[itemId]
    ) return;

    const files = this.finalFiles[itemId] || [];
    if (files.length === 0) {
      this.toast.notify('Vui lòng chọn ít nhất 1 hình ảnh sản phẩm hoàn thiện.');
      return;
    }
    if (files.length > 10) {
      this.toast.notify('Tối đa 10 hình ảnh cho mỗi lần nộp.');
      return;
    }

    if (!this.finalIdempotencyKeys[itemId]) {
      this.finalIdempotencyKeys[itemId] = this.checkpointService.generateIdempotencyKey();
    }
    const key = this.finalIdempotencyKeys[itemId];

    const pendingPayload = this.finalPendingPayloads[itemId];
    if (pendingPayload) {
      this.sendFinalCheckpoint(itemId, pendingPayload, key);
      return;
    }

    this.isUploadingFinal[itemId] = true;
    this.checkpointService.uploadImages(files).subscribe({
      next: (imageUrls) => {
        this.isUploadingFinal[itemId] = false;
        this.isSubmittingFinal[itemId] = true;

        const payload: SubmitProductionCheckpointRequest = {
          orderVersion: this.orderVersion,
          stage: 'FINAL_PRODUCT',
          imageUrls,
          note: (this.finalNotes[itemId] || '').trim(),
        };
        this.finalPendingPayloads[itemId] = payload;
        this.sendFinalCheckpoint(itemId, payload, key);
      },
      error: (err) => {
        this.isUploadingFinal[itemId] = false;
        this.toast.notify('Lỗi tải ảnh lên hệ thống: ' + getApiErrorMessage(err, 'Vui lòng thử lại.'));
      },
    });
  }

  private sendFinalCheckpoint(
    itemId: number,
    payload: SubmitProductionCheckpointRequest,
    idempotencyKey: string,
  ): void {
    this.isSubmittingFinal[itemId] = true;
    this.checkpointService.submitCheckpoint(this.orderId, itemId, payload, idempotencyKey).subscribe({
      next: (res) => {
        this.isSubmittingFinal[itemId] = false;
        this.finalFiles[itemId] = [];
        this.finalPreviews[itemId] = [];
        this.finalNotes[itemId] = '';
        delete this.finalIdempotencyKeys[itemId];
        delete this.finalPendingPayloads[itemId];

        this.toast.notify(`Đã nộp sản phẩm hoàn thiện (Lần #${res.attemptNumber}) thành công! Đang chờ Manager kiểm định KCS.`);
        this.orderUpdated.emit();
        this.loadProgress();
      },
      error: (err) => {
        this.isSubmittingFinal[itemId] = false;
        if (err?.status === 409) {
          delete this.finalIdempotencyKeys[itemId];
          delete this.finalPendingPayloads[itemId];
          this.toast.notify('Dữ liệu đã thay đổi (409). Đang tải lại thông tin mới nhất...');
          this.orderUpdated.emit();
          this.loadProgress();
        } else if (err?.status === 403) {
          delete this.finalIdempotencyKeys[itemId];
          delete this.finalPendingPayloads[itemId];
          this.accessDenied = true;
          this.toast.notify('Bạn không còn quyền cập nhật đơn hàng này. Đang làm mới danh sách được phân công...');
          this.orderUpdated.emit();
        } else {
          this.toast.notify('Không thể nộp sản phẩm hoàn thiện: ' + getApiErrorMessage(err, 'Vui lòng kiểm tra lại. Bạn có thể thử gửi lại mà không cần tải ảnh lần nữa.'));
        }
      },
    });
  }

  openImageModal(url: string): void {
    this.enlargedImageUrl = url;
  }

  closeImageModal(): void {
    this.enlargedImageUrl = null;
  }
}
