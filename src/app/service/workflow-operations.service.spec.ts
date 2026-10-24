import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import {
  WorkflowDlqIncident,
  WorkflowOperationsSummary,
  WorkflowOutboxIncident,
} from '../model/workflow-operations.model';
import { WorkflowOperationsService } from './workflow-operations.service';

describe('WorkflowOperationsService', () => {
  let service: WorkflowOperationsService;
  let httpMock: HttpTestingController;

  const mockSummary: WorkflowOperationsSummary = {
    pendingOutboxEvents: 3,
    retryingOutboxEvents: 1,
    publishedOutboxEvents: 120,
    oldestPendingAt: '2026-10-17T08:00:00',
  };

  const mockOutboxIncidents: WorkflowOutboxIncident[] = [
    {
      eventId: 'evt-outbox-1',
      eventType: 'ORDER_ACCEPTED',
      attempts: 3,
      occurredAt: '2026-10-17T08:00:00',
      dueAt: '2026-10-17T08:05:00',
      lastError: 'Connection refused',
    },
  ];

  const mockDlqIncidents: WorkflowDlqIncident[] = [
    {
      recordId: '1697520000000-0',
      eventId: 'evt-dlq-1',
      eventType: 'ORDER_CHECKPOINT_FINAL_SUBMITTED',
      attempts: 5,
      errorSummary: 'Serialization exception',
      failedAt: '2026-10-17T08:10:00Z',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), WorkflowOperationsService],
    });
    service = TestBed.inject(WorkflowOperationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches workflow operations summary', () => {
    service.getSummary().subscribe((summary) => {
      expect(summary).toEqual(mockSummary);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/manager/workflow-operations/summary`);
    expect(req.request.method).toBe('GET');
    req.flush({
      success: true,
      status: 200,
      message: 'OK',
      data: mockSummary,
    });
  });

  it('fetches outbox incidents with limit query param', () => {
    service.getOutboxIncidents(25).subscribe((incidents) => {
      expect(incidents.length).toBe(1);
      expect(incidents[0].eventId).toBe('evt-outbox-1');
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/manager/workflow-operations/outbox/incidents?limit=25`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      success: true,
      status: 200,
      message: 'OK',
      data: mockOutboxIncidents,
    });
  });

  it('posts requeue for an outbox event', () => {
    service.requeueOutbox('evt-outbox-1').subscribe((result) => {
      expect(result).toBeTrue();
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/manager/workflow-operations/outbox/evt-outbox-1/requeue`,
    );
    expect(req.request.method).toBe('POST');
    req.flush({
      success: true,
      status: 200,
      message: 'Outbox event queued for retry.',
      data: true,
    });
  });

  it('fetches dlq count', () => {
    service.getDlqCount().subscribe((count) => {
      expect(count).toBe(7);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/manager/workflow-operations/dlq/count`);
    expect(req.request.method).toBe('GET');
    req.flush({
      success: true,
      status: 200,
      message: 'OK',
      data: 7,
    });
  });

  it('fetches dlq incidents with limit query param', () => {
    service.getDlqIncidents(50).subscribe((incidents) => {
      expect(incidents.length).toBe(1);
      expect(incidents[0].recordId).toBe('1697520000000-0');
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/manager/workflow-operations/dlq/incidents?limit=50`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      success: true,
      status: 200,
      message: 'OK',
      data: mockDlqIncidents,
    });
  });

  it('posts replay for a dlq record', () => {
    service.replayDlq('1697520000000-0').subscribe((result) => {
      expect(result).toBeTrue();
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/manager/workflow-operations/dlq/1697520000000-0/replay`,
    );
    expect(req.request.method).toBe('POST');
    req.flush({
      success: true,
      status: 200,
      message: 'DLQ event replayed.',
      data: true,
    });
  });
});

