import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  WorkflowDlqIncident,
  WorkflowOperationsSummary,
  WorkflowOutboxIncident,
} from '../../../model/workflow-operations.model';
import { ActionDialogService } from '../../../service/action-dialog.service';
import { ToastService } from '../../../service/toast.service';
import { WorkflowOperationsService } from '../../../service/workflow-operations.service';
import { WorkflowOperationsComponent } from './workflow-operations.component';

describe('WorkflowOperationsComponent', () => {
  let fixture: ComponentFixture<WorkflowOperationsComponent>;
  let component: WorkflowOperationsComponent;
  let operationsService: jasmine.SpyObj<WorkflowOperationsService>;
  let actionDialog: jasmine.SpyObj<ActionDialogService>;
  let toast: jasmine.SpyObj<ToastService>;

  const mockSummary: WorkflowOperationsSummary = {
    pendingOutboxEvents: 5,
    retryingOutboxEvents: 2,
    publishedOutboxEvents: 340,
    oldestPendingAt: '2026-10-17T09:00:00',
  };

  const mockOutboxIncidents: WorkflowOutboxIncident[] = [
    {
      eventId: 'evt-outbox-1',
      eventType: 'ORDER_ACCEPTED',
      attempts: 2,
      occurredAt: '2026-10-17T09:00:00',
      dueAt: '2026-10-17T09:05:00',
      lastError: 'HTTP 503 Service Unavailable',
    },
  ];

  const mockDlqIncidents: WorkflowDlqIncident[] = [
    {
      recordId: '1729150000000-0',
      eventId: 'evt-dlq-1',
      eventType: 'ORDER_CHECKPOINT_FINAL_SUBMITTED',
      attempts: 5,
      errorSummary: 'Deadlock encountered',
      failedAt: '2026-10-17T09:10:00Z',
    },
  ];

  beforeEach(async () => {
    operationsService = jasmine.createSpyObj<WorkflowOperationsService>('WorkflowOperationsService', [
      'getSummary',
      'getOutboxIncidents',
      'requeueOutbox',
      'getDlqCount',
      'getDlqIncidents',
      'replayDlq',
    ]);
    actionDialog = jasmine.createSpyObj<ActionDialogService>('ActionDialogService', ['confirm']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['notify']);

    operationsService.getSummary.and.returnValue(of(mockSummary));
    operationsService.getOutboxIncidents.and.returnValue(of(mockOutboxIncidents));
    operationsService.getDlqCount.and.returnValue(of(1));
    operationsService.getDlqIncidents.and.returnValue(of(mockDlqIncidents));

    await TestBed.configureTestingModule({
      imports: [WorkflowOperationsComponent],
      providers: [
        { provide: WorkflowOperationsService, useValue: operationsService },
        { provide: ActionDialogService, useValue: actionDialog },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowOperationsComponent);
    component = fixture.componentInstance;
  });

  it('should initialize and load summary, outbox incidents, dlq count, and dlq incidents', () => {
    fixture.detectChanges();

    expect(operationsService.getSummary).toHaveBeenCalled();
    expect(operationsService.getOutboxIncidents).toHaveBeenCalledWith(50);
    expect(operationsService.getDlqCount).toHaveBeenCalled();
    expect(operationsService.getDlqIncidents).toHaveBeenCalledWith(50);

    expect(component.summary).toEqual(mockSummary);
    expect(component.outboxIncidents).toEqual(mockOutboxIncidents);
    expect(component.dlqCount).toBe(1);
    expect(component.dlqIncidents).toEqual(mockDlqIncidents);
    expect(component.isRedisAvailable).toBeTrue();
    expect(component.accessDenied).toBeFalse();
  });

  it('should display access denied banner when backend returns 403', () => {
    operationsService.getSummary.and.returnValue(throwError(() => ({ status: 403 })));
    fixture.detectChanges();

    expect(component.accessDenied).toBeTrue();
  });

  it('should handle Redis unavailable (5xx) by marking isRedisAvailable false and leaving dlqCount null', () => {
    operationsService.getDlqCount.and.returnValue(
      throwError(() => ({ status: 503, error: { message: 'Redis connection error' } })),
    );
    operationsService.getDlqIncidents.and.returnValue(
      throwError(() => ({ status: 503, error: { message: 'Redis connection error' } })),
    );

    fixture.detectChanges();

    expect(component.isRedisAvailable).toBeFalse();
    expect(component.dlqCount).toBeNull();
    expect(component.dlqIncidents).toEqual([]);
    expect(component.redisErrorMessage).toBeTruthy();
  });

  describe('requeueOutbox', () => {
    it('should confirm before requeueing and handle success result (data=true)', () => {
      fixture.detectChanges();
      actionDialog.confirm.and.returnValue(of(true));
      operationsService.requeueOutbox.and.returnValue(of(true));

      component.requeueOutbox(mockOutboxIncidents[0]);

      expect(actionDialog.confirm).toHaveBeenCalled();
      expect(operationsService.requeueOutbox).toHaveBeenCalledWith('evt-outbox-1');
      expect(toast.notify).toHaveBeenCalledWith('Đã đưa sự kiện vào hàng đợi thử lại thành công.');
    });

    it('should notify and reload when requeue result is data=false (not found / already processed)', () => {
      fixture.detectChanges();
      actionDialog.confirm.and.returnValue(of(true));
      operationsService.requeueOutbox.and.returnValue(of(false));

      component.requeueOutbox(mockOutboxIncidents[0]);

      expect(operationsService.requeueOutbox).toHaveBeenCalledWith('evt-outbox-1');
      expect(toast.notify).toHaveBeenCalledWith(
        'Sự kiện không tìm thấy hoặc đã được xử lý (đang làm mới...).',
      );
    });

    it('should not call service if user cancels dialog', () => {
      fixture.detectChanges();
      actionDialog.confirm.and.returnValue(of(false));

      component.requeueOutbox(mockOutboxIncidents[0]);

      expect(operationsService.requeueOutbox).not.toHaveBeenCalled();
    });

    it('should prevent double click when event is already being requeued', () => {
      fixture.detectChanges();
      component.requeueingEventIds.add('evt-outbox-1');

      component.requeueOutbox(mockOutboxIncidents[0]);

      expect(actionDialog.confirm).not.toHaveBeenCalled();
      expect(operationsService.requeueOutbox).not.toHaveBeenCalled();
    });
  });

  describe('replayDlq', () => {
    it('should confirm before replaying and handle success result (data=true)', () => {
      fixture.detectChanges();
      actionDialog.confirm.and.returnValue(of(true));
      operationsService.replayDlq.and.returnValue(of(true));

      component.replayDlq(mockDlqIncidents[0]);

      expect(actionDialog.confirm).toHaveBeenCalled();
      expect(operationsService.replayDlq).toHaveBeenCalledWith('1729150000000-0');
      expect(toast.notify).toHaveBeenCalledWith('Đã phát lại (replay) sự kiện DLQ thành công.');
    });

    it('should notify and reload when replay result is data=false (not found / already processed)', () => {
      fixture.detectChanges();
      actionDialog.confirm.and.returnValue(of(true));
      operationsService.replayDlq.and.returnValue(of(false));

      component.replayDlq(mockDlqIncidents[0]);

      expect(operationsService.replayDlq).toHaveBeenCalledWith('1729150000000-0');
      expect(toast.notify).toHaveBeenCalledWith(
        'Bản ghi DLQ không tìm thấy hoặc đã được xử lý (đang làm mới...).',
      );
    });

    it('should not call service if user cancels dialog', () => {
      fixture.detectChanges();
      actionDialog.confirm.and.returnValue(of(false));

      component.replayDlq(mockDlqIncidents[0]);

      expect(operationsService.replayDlq).not.toHaveBeenCalled();
    });

    it('should prevent double click when record is already being replayed', () => {
      fixture.detectChanges();
      component.replayingRecordIds.add('1729150000000-0');

      component.replayDlq(mockDlqIncidents[0]);

      expect(actionDialog.confirm).not.toHaveBeenCalled();
      expect(operationsService.replayDlq).not.toHaveBeenCalled();
    });
  });

  it('should reload outbox incidents when limit changes', () => {
    fixture.detectChanges();

    component.onOutboxLimitChange(100);

    expect(component.outboxLimit).toBe(100);
    expect(operationsService.getOutboxIncidents).toHaveBeenCalledWith(100);
  });

  it('should reload dlq data when limit changes', () => {
    fixture.detectChanges();

    component.onDlqLimitChange(200);

    expect(component.dlqLimit).toBe(200);
    expect(operationsService.getDlqIncidents).toHaveBeenCalledWith(200);
  });
});

