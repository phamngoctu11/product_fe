import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, map, of } from 'rxjs';
import { getApiErrorMessage, unwrapApiResponse } from '../../../model/api-response.model';
import {
  ChangeRequestDecision,
  Order,
  OrderChangeRequest,
  OrderItem,
} from '../../../model/order.model';
import { OrderService } from '../../../service/order.service';
import { ToastService } from '../../../service/toast.service';
import { UploadService } from '../../../service/upload.service';

@Component({
  selector: 'app-change-request-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-request-panel.component.html',
  styleUrl: './change-request-panel.component.css',
})
export class ChangeRequestPanelComponent implements OnChanges {
  @Input({ required: true }) order!: Order;
  @Input({ required: true }) mode: 'USER' | 'STAFF' = 'USER';
  @Output() changed = new EventEmitter<void>();

  private readonly orderService = inject(OrderService);
  private readonly uploadService = inject(UploadService);
  private readonly toast = inject(ToastService);

  requests: OrderChangeRequest[] = [];
  loading = false;
  loadError = '';
  submitting = false;
  selectedItemId: number | null = null;
  proposedDescription = '';
  reason = '';
  files: File[] = [];
  previews: string[] = [];
  decisionReasons: Record<number, string> = {};
  decidingId: number | null = null;
  private createKey: string | null = null;
  private decisionKeys: Record<number, string> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['order'] && this.order?.id) {
      this.resetDraft();
      this.load();
    }
  }

  get eligibleItems(): OrderItem[] {
    return this.items.filter((item) => {
      const status = (item.productionStatus || '').toUpperCase();
      return item.handmade === true
        && ['WAITING_ASSIGNMENT', 'ASSIGNED', 'INITIAL_IN_PROGRESS', 'FINAL_IN_PROGRESS'].includes(status);
    });
  }

  get items(): OrderItem[] {
    return this.order?.items || this.order?.orderItems || this.order?.details || [];
  }

  get canCreate(): boolean {
    return this.mode === 'USER'
      && ['ORDER_ACCEPTED', 'ORDER_CREATING'].includes((this.order?.status || '').toUpperCase())
      && this.eligibleItems.length > 0;
  }

  get pendingRequests(): OrderChangeRequest[] {
    return this.requests.filter((request) => request.status === 'PENDING_REVIEW');
  }

  load(): void {
    if (!this.order?.id) return;
    this.loading = true;
    this.loadError = '';
    this.orderService.getChangeRequests(this.order.id).subscribe({
      next: (requests) => {
        this.requests = requests || [];
        this.loading = false;
      },
      error: (error) => {
        this.loadError = getApiErrorMessage(error, 'Không thể tải yêu cầu chỉnh sửa.');
        this.loading = false;
      },
    });
  }

  selectItem(): void {
    const item = this.eligibleItems.find((candidate) => this.itemId(candidate) === this.selectedItemId);
    this.proposedDescription = item?.description || this.snapshotDescription(item?.specSnapshot) || '';
    this.files = [];
    this.previews = [];
    this.createKey = null;
  }

  selectFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const incoming = Array.from(input.files || []);
    this.files = [...this.files, ...incoming].slice(0, 10);
    this.previews = this.files.map((file) => URL.createObjectURL(file));
    input.value = '';
  }

  removeFile(index: number): void {
    this.files = this.files.filter((_, fileIndex) => fileIndex !== index);
    this.previews = this.files.map((file) => URL.createObjectURL(file));
  }

  submit(): void {
    const item = this.eligibleItems.find((candidate) => this.itemId(candidate) === this.selectedItemId);
    if (!item || !this.proposedDescription.trim() || !this.reason.trim() || this.submitting) {
      this.toast.warning('Vui lòng chọn sản phẩm, nhập đặc tả mới và lý do chỉnh sửa.');
      return;
    }
    this.submitting = true;
    const uploads = this.files.map((file) => this.uploadService.uploadImage(file).pipe(map(unwrapApiResponse)));
    const uploaded$ = uploads.length > 0 ? forkJoin(uploads) : of([] as { url: string }[]);
    uploaded$.subscribe({
      next: (uploaded) => this.sendCreate(item, uploaded.map((value) => value.url)),
      error: (error) => {
        this.submitting = false;
        this.toast.fromError(error, 'Không thể tải ảnh đính kèm.');
      },
    });
  }

  decide(request: OrderChangeRequest, decision: ChangeRequestDecision): void {
    if (this.decidingId !== null) return;
    const reason = (this.decisionReasons[request.id] || '').trim();
    if (decision === 'REJECT' && !reason) {
      this.toast.warning('Vui lòng nhập lý do từ chối.');
      return;
    }
    this.decidingId = request.id;
    this.decisionKeys[request.id] ||= this.orderService.generateIdempotencyKey('staff-change-request', this.order.id);
    this.orderService.decideChangeRequest(this.order.id, request.id, {
      orderVersion: this.order.version ?? request.orderVersion,
      changeRequestVersion: request.version,
      decision,
      reason: reason || null,
    }, this.decisionKeys[request.id]).subscribe({
      next: (updated) => {
        delete this.decisionKeys[request.id];
        this.decidingId = null;
        this.replace(updated);
        this.toast.success(decision === 'ACCEPT' ? 'Đã áp dụng đặc tả mới.' : 'Đã từ chối yêu cầu chỉnh sửa.');
        this.changed.emit();
      },
      error: (error) => {
        this.decidingId = null;
        if (error?.status === 409) {
          delete this.decisionKeys[request.id];
          this.load();
          this.changed.emit();
        }
        this.toast.fromError(error, 'Không thể xử lý yêu cầu chỉnh sửa.');
      },
    });
  }

  proposalDescription(request: OrderChangeRequest): string {
    return this.snapshotDescription(request.proposedSpecSnapshot) || request.proposedSpecSnapshot;
  }

  proposalImages(request: OrderChangeRequest): string[] {
    try {
      const parsed = JSON.parse(request.proposedSpecSnapshot);
      return Array.isArray(parsed?.imageUrls) ? parsed.imageUrls : [];
    } catch {
      return [];
    }
  }

  statusLabel(status: string): string {
    return ({
      PENDING_REVIEW: 'Chờ staff duyệt',
      APPLIED: 'Đã áp dụng',
      REJECTED: 'Đã từ chối',
    } as Record<string, string>)[status] || status;
  }

  itemLabel(item: OrderItem): string {
    return `${item.productName || 'Sản phẩm'}${item.variantName ? ' — ' + item.variantName : ''}`;
  }

  itemId(item: OrderItem): number {
    return Number(item.orderItemId || item.id || 0);
  }

  private sendCreate(item: OrderItem, imageUrls: string[]): void {
    this.createKey ||= this.orderService.generateIdempotencyKey('user-change-request', this.order.id);
    this.orderService.createChangeRequest(this.order.id, {
      orderVersion: this.order.version ?? 0,
      orderItemId: this.itemId(item),
      baseSpecVersion: item.specVersion ?? 1,
      proposedDescription: this.proposedDescription.trim(),
      proposedImageUrls: imageUrls,
      reason: this.reason.trim(),
    }, this.createKey).subscribe({
      next: (created) => {
        this.createKey = null;
        this.submitting = false;
        this.requests = [created, ...this.requests];
        this.resetDraft();
        this.toast.success('Đã gửi yêu cầu chỉnh sửa cho staff phụ trách.');
      },
      error: (error) => {
        this.submitting = false;
        if (error?.status === 409) {
          this.createKey = null;
          this.load();
          this.changed.emit();
        }
        this.toast.fromError(error, 'Không thể gửi yêu cầu chỉnh sửa.');
      },
    });
  }

  private replace(updated: OrderChangeRequest): void {
    this.requests = this.requests.map((request) => request.id === updated.id ? updated : request);
  }

  private snapshotDescription(snapshot?: string | null): string {
    if (!snapshot) return '';
    try {
      const parsed = JSON.parse(snapshot);
      return typeof parsed?.description === 'string' ? parsed.description : '';
    } catch {
      return snapshot;
    }
  }

  private resetDraft(): void {
    this.selectedItemId = null;
    this.proposedDescription = '';
    this.reason = '';
    this.files = [];
    this.previews = [];
  }
}
