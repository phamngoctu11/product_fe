import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { getApiErrorMessage } from '../../../model/api-response.model';
import {
  ChangeRequestDecision,
  Order,
  OrderChangeRequest,
  OrderItem,
} from '../../../model/order.model';
import type { ProductTypeField } from '../../../model/custom-request.model';
import { ActionDialogService } from '../../../service/action-dialog.service';
import { OrderService } from '../../../service/order.service';
import { ToastService } from '../../../service/toast.service';

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
  private readonly toast = inject(ToastService);
  private readonly dialogService = inject(ActionDialogService);

  requests: OrderChangeRequest[] = [];
  loading = false;
  loadError = '';
  submitting = false;
  isForbidden = false;
  selectedItemId: number | null = null;
  proposedDescription = '';
  selectedTypeName = '';
  selectedFields: ProductTypeField[] = [];
  proposedFieldValues: Record<string, unknown> = {};
  reason = '';
  decisionReasons: Record<number, string> = {};
  decidingId: number | null = null;
  private createKey: string | null = null;
  private lastSubmittedPayload: {
    itemId: number;
    description: string;
    reason: string;
    fieldValues: Record<string, unknown>;
  } | null = null;
  private decisionKeys: Record<number, string> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['order'] && this.order?.id) {
      this.resetDraft();
      this.decisionKeys = {};
      this.decisionReasons = {};
      this.decidingId = null;
      this.isForbidden = false;
      this.load();
    }
  }

  get isGuest(): boolean {
    if (!this.order) return true;
    if (this.order.customer?.guest) return true;
    if (this.order.guestSessionId) return true;
    const userId = this.order.userId ?? this.order.user_id ?? this.order.customer?.userId;
    return !userId;
  }

  get eligibleItems(): OrderItem[] {
    return this.items.filter((item) => {
      const status = (item.productionStatus || '').toUpperCase();
      const hasValidId = typeof item.orderItemId === 'number' && item.orderItemId > 0;
      return hasValidId
        && ['WAITING_ASSIGNMENT', 'ASSIGNED', 'INITIAL_IN_PROGRESS', 'FINAL_IN_PROGRESS'].includes(status);
    });
  }

  get items(): OrderItem[] {
    return this.order?.items || this.order?.orderItems || this.order?.details || [];
  }

  get canCreate(): boolean {
    return this.mode === 'USER'
      && !this.isGuest
      && !this.isForbidden
      && typeof this.order?.version === 'number'
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
        if (error?.status === 403) {
          this.isForbidden = true;
        }
        this.loadError = getApiErrorMessage(error, 'Không thể tải yêu cầu chỉnh sửa.');
        this.loading = false;
      },
    });
  }

  selectItem(): void {
    const item = this.eligibleItems.find((candidate) => candidate.orderItemId === this.selectedItemId);
    this.proposedDescription = item?.description || this.snapshotDescription(item?.specSnapshot) || '';
    this.selectedTypeName = item?.productTypeName || '';
    this.selectedFields = item?.productTypeFields || [];
    this.proposedFieldValues = { ...(item?.fieldValues || {}) };
    if (item?.specSnapshot) {
      try {
        const snapshot = JSON.parse(item.specSnapshot);
        this.selectedTypeName ||= snapshot.productType?.name || '';
        this.selectedFields = this.selectedFields.length ? this.selectedFields : (snapshot.productTypeFields || []);
        if (!Object.keys(this.proposedFieldValues).length) {
          this.proposedFieldValues = { ...(snapshot.fieldValues || {}) };
        }
      } catch {
        // Keep the typed order item fields when reading a legacy plain-text snapshot.
      }
    }
    this.createKey = null;
    this.lastSubmittedPayload = null;
  }

  submit(): void {
    if (this.isForbidden || this.isGuest) {
      this.toast.warning('Bạn không có quyền gửi yêu cầu chỉnh sửa.');
      return;
    }
    if (typeof this.order?.id !== 'number' || typeof this.order?.version !== 'number') {
      this.toast.warning('Dữ liệu phiên bản đơn hàng không hợp lệ.');
      return;
    }
    const item = this.eligibleItems.find((candidate) => candidate.orderItemId === this.selectedItemId);
    if (!item || typeof item.orderItemId !== 'number' || typeof item.specVersion !== 'number') {
      this.toast.warning('Vui lòng chọn sản phẩm hợp lệ cần chỉnh sửa.');
      return;
    }
    if (!this.proposedDescription.trim() || !this.reason.trim()) {
      this.toast.warning('Vui lòng nhập đặc tả mong muốn và lý do chỉnh sửa.');
      return;
    }
    const fields = item.productTypeFields?.length ? item.productTypeFields : this.selectedFields;
    const invalidField = fields.find((field) => {
      const value = this.proposedFieldValues[field.code];
      if (value === null || value === undefined || value === '' || Array.isArray(value) && value.length === 0) return true;
      switch (field.kind) {
        case 'TEXT': return typeof value !== 'string' || !!field.maxLength && value.length > field.maxLength;
        case 'NUMBER': return typeof value !== 'number' || !Number.isFinite(value)
          || field.minimum != null && value < field.minimum || field.maximum != null && value > field.maximum;
        case 'BOOLEAN': return typeof value !== 'boolean';
        case 'SINGLE_SELECT': return typeof value !== 'string' || !field.options?.includes(value);
        case 'MULTI_SELECT': return !Array.isArray(value) || value.some((option) => typeof option !== 'string' || !field.options?.includes(option));
      }
    });
    if (invalidField) {
      this.toast.warning(`Vui lòng nhập giá trị hợp lệ cho trường “${invalidField.label}”.`);
      return;
    }
    if (this.submitting || this.decidingId !== null) {
      return;
    }

    const fieldValues = Object.fromEntries(fields.map((field) => [
      field.code,
      this.proposedFieldValues[field.code],
    ]));
    const currentPayload = {
      itemId: item.orderItemId,
      description: this.proposedDescription.trim(),
      reason: this.reason.trim(),
      fieldValues,
    };

    const isSamePayload = this.lastSubmittedPayload
      && this.lastSubmittedPayload.itemId === currentPayload.itemId
      && this.lastSubmittedPayload.description === currentPayload.description
      && this.lastSubmittedPayload.reason === currentPayload.reason
      && JSON.stringify(this.lastSubmittedPayload.fieldValues) === JSON.stringify(currentPayload.fieldValues);

    if (!isSamePayload) {
      this.createKey = this.orderService.generateIdempotencyKey('user-change-request', this.order.id);
      this.lastSubmittedPayload = currentPayload;
    } else if (!this.createKey) {
      this.createKey = this.orderService.generateIdempotencyKey('user-change-request', this.order.id);
    }

    this.submitting = true;
    this.sendCreate(item, fieldValues);
  }

  decide(request: OrderChangeRequest, decision: ChangeRequestDecision): void {
    if (this.decidingId !== null || this.submitting || this.isForbidden) return;
    if (typeof this.order?.version !== 'number') {
      this.toast.warning('Không tìm thấy phiên bản đơn hàng (orderVersion).');
      return;
    }
    if (typeof request.version !== 'number') {
      this.toast.warning('Không tìm thấy phiên bản yêu cầu chỉnh sửa.');
      return;
    }

    const reason = (this.decisionReasons[request.id] || '').trim();
    if (decision === 'REJECT') {
      if (!reason) {
        this.toast.warning('Vui lòng nhập lý do từ chối.');
        return;
      }
      if (reason.length > 2000) {
        this.toast.warning('Lý do từ chối không được vượt quá 2000 ký tự.');
        return;
      }
      this.executeDecision(request, 'REJECT', reason);
    } else {
      const targetName = request.productName || `Sản phẩm #${request.orderItemId}`;
      const nextSpecVersion = (request.baseSpecVersion ?? 1) + 1;
      this.dialogService.confirm({
        title: 'Chấp nhận yêu cầu chỉnh sửa',
        message: `Bạn có chắc chắn muốn chấp nhận yêu cầu chỉnh sửa cho "${targetName}"? Đặc tả mới sẽ được áp dụng (spec v${nextSpecVersion}), đơn giá, tổng tiền và deadline sản xuất vẫn giữ nguyên.`,
        confirmText: 'Chấp nhận & áp dụng',
        cancelText: 'Hủy',
        tone: 'primary',
        icon: 'bi-check-circle',
      }).subscribe((confirmed) => {
        if (confirmed) {
          this.executeDecision(request, 'ACCEPT', reason || null);
        }
      });
    }
  }

  private executeDecision(
    request: OrderChangeRequest,
    decision: ChangeRequestDecision,
    reason: string | null,
  ): void {
    this.decidingId = request.id;
    this.decisionKeys[request.id] ||= this.orderService.generateIdempotencyKey('staff-change-request', this.order.id);
    this.orderService.decideChangeRequest(this.order.id, request.id, {
      orderVersion: this.order.version!,
      changeRequestVersion: request.version,
      decision,
      reason,
    }, this.decisionKeys[request.id]).subscribe({
      next: (updated) => {
        delete this.decisionKeys[request.id];
        delete this.decisionReasons[request.id];
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
        } else if (error?.status === 403) {
          this.isForbidden = true;
        }
        this.toast.fromError(error, 'Không thể xử lý yêu cầu chỉnh sửa.');
      },
    });
  }

  proposalDescription(request: OrderChangeRequest): string {
    return this.snapshotDescription(request.proposedSpecSnapshot) || request.proposedSpecSnapshot;
  }

  proposalFieldEntries(request: OrderChangeRequest): { label: string; value: string }[] {
    try {
      const base = request.baseSpecSnapshot ? JSON.parse(request.baseSpecSnapshot) : {};
      const proposal = JSON.parse(request.proposedSpecSnapshot);
      const fields: ProductTypeField[] = Array.isArray(base?.productTypeFields) ? base.productTypeFields : [];
      const values = proposal?.fieldValues || base?.fieldValues || {};
      return fields.map((field) => {
        const value = values[field.code];
        const text = Array.isArray(value) ? value.join(', ') : typeof value === 'boolean' ? (value ? 'Có' : 'Không') : String(value ?? '');
        return { label: field.label, value: `${text}${field.unit ? ` ${field.unit}` : ''}` };
      });
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

  itemProductionStatusLabel(status?: string | null): string {
    if (!status) return 'Chưa có tiến độ';
    const map: Record<string, string> = {
      NOT_REQUIRED: 'Không yêu cầu',
      WAITING_ASSIGNMENT: 'Chờ giao thợ',
      ASSIGNED: 'Đã giao thợ',
      INITIAL_IN_PROGRESS: 'Đang tạo hình',
      INITIAL_WAITING_QC: 'Chờ duyệt tạo hình',
      INITIAL_REWORK_REQUIRED: 'Cần sửa tạo hình',
      FINAL_IN_PROGRESS: 'Đang hoàn thiện',
      FINAL_WAITING_QC: 'Chờ duyệt hoàn thiện',
      FINAL_REWORK_REQUIRED: 'Cần sửa hoàn thiện',
      READY: 'Hoàn thành / Sẵn sàng',
    };
    return map[status.toUpperCase()] || status;
  }

  itemLabel(item: OrderItem): string {
    return `${item.productName || 'Sản phẩm'}${item.variantName ? ' — ' + item.variantName : ''}`;
  }

  itemId(item: OrderItem): number {
    return Number(item.orderItemId || 0);
  }

  private sendCreate(item: OrderItem, fieldValues: Record<string, unknown>): void {
    this.orderService.createChangeRequest(this.order.id, {
      orderVersion: this.order.version!,
      orderItemId: item.orderItemId!,
      baseSpecVersion: item.specVersion ?? 1,
      proposedDescription: this.proposedDescription.trim(),
      fieldValues,
      reason: this.reason.trim(),
    }, this.createKey!).subscribe({
      next: (created) => {
        this.createKey = null;
        this.lastSubmittedPayload = null;
        this.submitting = false;
        this.requests = [created, ...this.requests];
        this.resetDraft();
        this.toast.success('Đã gửi yêu cầu chỉnh sửa cho staff phụ trách.');
        this.changed.emit();
      },
      error: (error) => {
        this.submitting = false;
        if (error?.status === 409) {
          this.createKey = null;
          this.lastSubmittedPayload = null;
          this.load();
          this.changed.emit();
        } else if (error?.status === 403) {
          this.isForbidden = true;
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
    this.selectedTypeName = '';
    this.selectedFields = [];
    this.proposedFieldValues = {};
    this.reason = '';
    this.createKey = null;
    this.lastSubmittedPayload = null;
  }
}
