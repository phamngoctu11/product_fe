import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { getApiErrorMessage } from '../../../model/api-response.model';
import {
  WorkflowDlqIncident,
  WorkflowOperationsSummary,
  WorkflowOutboxIncident,
} from '../../../model/workflow-operations.model';
import { ActionDialogService } from '../../../service/action-dialog.service';
import { ToastService } from '../../../service/toast.service';
import { WorkflowOperationsService } from '../../../service/workflow-operations.service';
import { PageHeaderComponent } from '../../shared/ui';

@Component({
  selector: 'app-workflow-operations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
  ],
  templateUrl: './workflow-operations.component.html',
  styleUrl: './workflow-operations.component.css',
})
export class WorkflowOperationsComponent implements OnInit {
  private readonly operationsService = inject(WorkflowOperationsService);
  private readonly actionDialog = inject(ActionDialogService);
  private readonly toast = inject(ToastService);

  // Summary state
  summary: WorkflowOperationsSummary | null = null;
  isLoadingSummary = false;
  summaryError = '';

  // DLQ count & Redis state
  dlqCount: number | null = null;
  isRedisAvailable = true;
  redisErrorMessage = '';

  // Outbox incidents state
  outboxIncidents: WorkflowOutboxIncident[] = [];
  isLoadingOutbox = false;
  outboxError = '';
  outboxLimit = 50;
  readonly outboxLimits = [20, 50, 100, 200];
  requeueingEventIds = new Set<string>();

  // DLQ incidents state
  dlqIncidents: WorkflowDlqIncident[] = [];
  isLoadingDlq = false;
  dlqError = '';
  dlqLimit = 50;
  readonly dlqLimits = [20, 50, 100, 200];
  replayingRecordIds = new Set<string>();

  // Access control
  accessDenied = false;

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.accessDenied = false;
    this.loadSummary();
    this.loadOutboxIncidents();
    this.loadDlqData();
  }

  loadSummary(): void {
    this.isLoadingSummary = true;
    this.summaryError = '';

    this.operationsService.getSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.isLoadingSummary = false;
      },
      error: (err) => {
        this.isLoadingSummary = false;
        if (err?.status === 403) {
          this.accessDenied = true;
        } else {
          this.summaryError = getApiErrorMessage(err, 'Không thể tải thống kê tổng quan.');
        }
      },
    });
  }

  loadOutboxIncidents(): void {
    this.isLoadingOutbox = true;
    this.outboxError = '';

    this.operationsService.getOutboxIncidents(this.outboxLimit).subscribe({
      next: (data) => {
        this.outboxIncidents = data || [];
        this.isLoadingOutbox = false;
      },
      error: (err) => {
        this.isLoadingOutbox = false;
        if (err?.status === 403) {
          this.accessDenied = true;
        } else {
          this.outboxError = getApiErrorMessage(err, 'Không thể tải danh sách outbox incident.');
        }
      },
    });
  }

  onOutboxLimitChange(limit: number): void {
    this.outboxLimit = limit;
    this.loadOutboxIncidents();
  }

  requeueOutbox(incident: WorkflowOutboxIncident): void {
    if (this.requeueingEventIds.has(incident.eventId)) {
      return;
    }

    this.actionDialog
      .confirm({
        title: 'Xác nhận xử lý lại Outbox',
        message: `Đưa sự kiện ${incident.eventId} (${incident.eventType}) vào hàng đợi thử lại ngay?`,
        confirmText: 'Requeue ngay',
        cancelText: 'Hủy',
        tone: 'primary',
        icon: 'bi-arrow-clockwise',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.requeueingEventIds.add(incident.eventId);
        this.operationsService.requeueOutbox(incident.eventId).subscribe({
          next: (success) => {
            this.requeueingEventIds.delete(incident.eventId);
            if (success) {
              this.toast.notify('Đã đưa sự kiện vào hàng đợi thử lại thành công.');
            } else {
              this.toast.notify('Sự kiện không tìm thấy hoặc đã được xử lý (đang làm mới...).');
            }
            this.loadSummary();
            this.loadOutboxIncidents();
          },
          error: (err) => {
            this.requeueingEventIds.delete(incident.eventId);
            this.toast.notify('Lỗi khi requeue outbox: ' + getApiErrorMessage(err, 'Thao tác thất bại.'));
            this.loadSummary();
            this.loadOutboxIncidents();
          },
        });
      });
  }

  loadDlqData(): void {
    this.isLoadingDlq = true;
    this.dlqError = '';

    forkJoin({
      count: this.operationsService.getDlqCount().pipe(
        catchError((err) => {
          if (err?.status >= 500) {
            this.isRedisAvailable = false;
            this.redisErrorMessage = 'Dịch vụ Redis tạm thời không khả dụng.';
          }
          return of(null);
        }),
      ),
      incidents: this.operationsService.getDlqIncidents(this.dlqLimit).pipe(
        catchError((err) => {
          if (err?.status >= 500) {
            this.isRedisAvailable = false;
            this.redisErrorMessage = 'Dịch vụ Redis tạm thời không khả dụng.';
          } else if (err?.status === 403) {
            this.accessDenied = true;
          }
          return of(null);
        }),
      ),
    }).subscribe({
      next: ({ count, incidents }) => {
        this.isLoadingDlq = false;
        if (count !== null) {
          this.dlqCount = count;
          this.isRedisAvailable = true;
          this.redisErrorMessage = '';
        } else if (this.isRedisAvailable) {
          // Both null without 500 error
          this.dlqCount = null;
        }

        if (incidents !== null) {
          this.dlqIncidents = incidents;
        } else if (!this.isRedisAvailable) {
          this.dlqIncidents = [];
        }
      },
      error: (err) => {
        this.isLoadingDlq = false;
        if (err?.status === 403) {
          this.accessDenied = true;
        } else {
          this.dlqError = getApiErrorMessage(err, 'Không thể tải dữ liệu DLQ.');
        }
      },
    });
  }

  onDlqLimitChange(limit: number): void {
    this.dlqLimit = limit;
    this.loadDlqData();
  }

  replayDlq(incident: WorkflowDlqIncident): void {
    if (this.replayingRecordIds.has(incident.recordId)) {
      return;
    }

    this.actionDialog
      .confirm({
        title: 'Xác nhận phát lại DLQ',
        message: `Phát lại sự kiện record ${incident.recordId} (${incident.eventType})?`,
        confirmText: 'Phát lại (Replay)',
        cancelText: 'Hủy',
        tone: 'warning',
        icon: 'bi-play-circle',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.replayingRecordIds.add(incident.recordId);
        this.operationsService.replayDlq(incident.recordId).subscribe({
          next: (success) => {
            this.replayingRecordIds.delete(incident.recordId);
            if (success) {
              this.toast.notify('Đã phát lại (replay) sự kiện DLQ thành công.');
            } else {
              this.toast.notify('Bản ghi DLQ không tìm thấy hoặc đã được xử lý (đang làm mới...).');
            }
            this.loadSummary();
            this.loadDlqData();
          },
          error: (err) => {
            this.replayingRecordIds.delete(incident.recordId);
            this.toast.notify('Lỗi khi replay DLQ: ' + getApiErrorMessage(err, 'Thao tác thất bại.'));
            this.loadSummary();
            this.loadDlqData();
          },
        });
      });
  }
}
