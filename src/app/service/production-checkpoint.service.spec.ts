import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductionCheckpointService } from './production-checkpoint.service';
import { environment } from '../../environments/environment';
import {
  OrderItemProductionDTO,
  ProductionCheckpointDTO,
  ReviewProductionCheckpointRequest,
  ReviewProductionCheckpointResultDTO,
  SubmitProductionCheckpointRequest,
} from '../model/production-checkpoint.model';

describe('ProductionCheckpointService', () => {
  let service: ProductionCheckpointService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/orders`;
  const guestUrl = `${environment.apiUrl}/guest/orders`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductionCheckpointService],
    });

    service = TestBed.inject(ProductionCheckpointService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('submitCheckpoint', () => {
    it('should POST to /staff/{orderId}/items/{orderItemId}/checkpoints with Idempotency-Key header', () => {
      const orderId = 10;
      const orderItemId = 101;
      const idempotencyKey = 'idemp-submit-123';
      const request: SubmitProductionCheckpointRequest = {
        orderVersion: 2,
        stage: 'INITIAL_SHAPE',
        imageUrls: ['https://example.com/shape.jpg'],
        note: 'Tạo dáng xong',
      };

      const mockResponse: ProductionCheckpointDTO = {
        id: 1,
        orderItemId,
        stage: 'INITIAL_SHAPE',
        status: 'PASSED',
        attemptNumber: 1,
        note: 'Tạo dáng xong',
        managerReviewRequired: false,
        submittedAt: '2026-10-15T10:00:00Z',
        images: [{ imageUrl: 'https://example.com/shape.jpg' }],
        version: 0,
      };

      service.submitCheckpoint(orderId, orderItemId, request, idempotencyKey).subscribe((res) => {
        expect(res).toEqual(mockResponse);
        expect(res.status).toBe('PASSED');
      });

      const req = httpMock.expectOne(`${baseUrl}/staff/${orderId}/items/${orderItemId}/checkpoints`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Idempotency-Key')).toBe(idempotencyKey);
      expect(req.request.body).toEqual(request);

      req.flush({ success: true, status: 200, message: 'OK', data: mockResponse });
    });
  });

  describe('reviewCheckpoint', () => {
    it('should POST to /manager/{orderId}/checkpoints/{checkpointId}/review with Idempotency-Key header', () => {
      const orderId = 10;
      const checkpointId = 5;
      const idempotencyKey = 'idemp-review-456';
      const request: ReviewProductionCheckpointRequest = {
        checkpointVersion: 1,
        decision: 'PASS',
      };

      const mockResult: ReviewProductionCheckpointResultDTO = {
        checkpoint: {
          id: checkpointId,
          orderItemId: 101,
          stage: 'FINAL_PRODUCT',
          status: 'PASSED',
          attemptNumber: 1,
          managerReviewRequired: true,
          submittedAt: '2026-10-15T10:30:00Z',
          images: [{ imageUrl: 'https://example.com/final.jpg' }],
          version: 2,
        },
        orderId,
        orderVersion: 3,
        orderStatus: 'READY_TO_SHIP',
        itemProductionStatus: 'READY',
        remainingOrderItemIds: [],
        assignmentReleased: true,
      };

      service.reviewCheckpoint(orderId, checkpointId, request, idempotencyKey).subscribe((res) => {
        expect(res.orderStatus).toBe('READY_TO_SHIP');
        expect(res.assignmentReleased).toBeTrue();
        expect(res.remainingOrderItemIds.length).toBe(0);
      });

      const req = httpMock.expectOne(`${baseUrl}/manager/${orderId}/checkpoints/${checkpointId}/review`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Idempotency-Key')).toBe(idempotencyKey);
      expect(req.request.body).toEqual(request);

      req.flush({ success: true, status: 200, message: 'OK', data: mockResult });
    });

    it('should send reason when decision is REWORK_REQUIRED', () => {
      const orderId = 10;
      const checkpointId = 5;
      const idempotencyKey = 'idemp-rework-789';
      const request: ReviewProductionCheckpointRequest = {
        checkpointVersion: 1,
        decision: 'REWORK_REQUIRED',
        reason: 'Màu men bị rạn nứt góc trên',
      };

      const mockResult: ReviewProductionCheckpointResultDTO = {
        checkpoint: {
          id: checkpointId,
          orderItemId: 101,
          stage: 'FINAL_PRODUCT',
          status: 'REWORK_REQUIRED',
          attemptNumber: 1,
          managerReviewRequired: true,
          submittedAt: '2026-10-15T10:30:00Z',
          images: [{ imageUrl: 'https://example.com/final.jpg' }],
          decision: {
            decisionType: 'REWORK_REQUIRED',
            reason: 'Màu men bị rạn nứt góc trên',
          },
          version: 2,
        },
        orderId,
        orderVersion: 3,
        orderStatus: 'ORDER_CREATING',
        itemProductionStatus: 'FINAL_REWORK_REQUIRED',
        remainingOrderItemIds: [101],
        assignmentReleased: false,
      };

      service.reviewCheckpoint(orderId, checkpointId, request, idempotencyKey).subscribe((res) => {
        expect(res.orderStatus).toBe('ORDER_CREATING');
        expect(res.assignmentReleased).toBeFalse();
        expect(res.checkpoint.decision?.reason).toBe('Màu men bị rạn nứt góc trên');
      });

      const req = httpMock.expectOne(`${baseUrl}/manager/${orderId}/checkpoints/${checkpointId}/review`);
      expect(req.request.body.reason).toBe('Màu men bị rạn nứt góc trên');
      req.flush({ success: true, status: 200, message: 'OK', data: mockResult });
    });
  });

  describe('getProgress & getGuestProgress', () => {
    it('should GET authenticated progress from /orders/{orderId}/checkpoints', () => {
      const orderId = 15;
      const mockItems: OrderItemProductionDTO[] = [
        {
          orderItemId: 201,
          productName: 'Tượng gốm thủ công',
          quantity: 20,
          handmade: true,
          productionStatus: 'FINAL_IN_PROGRESS',
          checkpoints: [],
        },
      ];

      service.getProgress(orderId).subscribe((items) => {
        expect(items.length).toBe(1);
        expect(items[0].quantity).toBe(20);
        expect(items[0].orderItemId).toBe(201);
      });

      const req = httpMock.expectOne(`${baseUrl}/${orderId}/checkpoints`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, status: 200, message: 'OK', data: mockItems });
    });

    it('should GET guest progress from /guest/orders/{orderId}/checkpoints?token=xxx', () => {
      const orderId = 15;
      const token = 'guest-signed-token-123';
      const mockItems: OrderItemProductionDTO[] = [
        {
          orderItemId: 201,
          productName: 'Tượng gốm thủ công',
          quantity: 5,
          handmade: true,
          productionStatus: 'INITIAL_IN_PROGRESS',
          checkpoints: [],
        },
      ];

      service.getGuestProgress(orderId, token).subscribe((items) => {
        expect(items.length).toBe(1);
      });

      const req = httpMock.expectOne(`${guestUrl}/${orderId}/checkpoints?token=${token}`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, status: 200, message: 'OK', data: mockItems });
    });
  });

  describe('generateIdempotencyKey', () => {
    it('should generate non-empty string and reuse prefix if supplied', () => {
      const key1 = service.generateIdempotencyKey();
      const key2 = service.generateIdempotencyKey();
      expect(key1).toBeTruthy();
      expect(key2).toBeTruthy();
      expect(key1).not.toEqual(key2);

      const prefixedKey = service.generateIdempotencyKey('kcs-pass', 50);
      expect(prefixedKey).toContain('kcs-pass-50-');
    });
  });
});
