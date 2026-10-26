import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OrderService } from './order.service';
import { environment } from '../../environments/environment';
import {
  CreateOrderChangeRequest,
  DecideOrderChangeRequest,
  OrderChangeRequest,
  ReceiptConfirmRequest,
  ReceiptConfirmResponse,
  ReceiptViewDTO,
  ReorderResponseDTO,
  ShippingHandoverRequest,
  ShippingHandoverResponse,
} from '../model/order.model';
import { ApiResponse } from '../model/api-response.model';

describe('OrderService - ChangeRequest Endpoints (WF06)', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/orders`;

  const mockChangeRequest: OrderChangeRequest = {
    id: 101,
    version: 0,
    orderId: 50,
    orderVersion: 2,
    orderItemId: 15,
    productName: 'Tách trà Bát Tràng',
    variantName: 'Men rạn',
    ownerId: 'user-001',
    assignedStaffId: 'staff-002',
    baseAgreementVersion: 1,
    baseSpecVersion: 1,
    baseSpecSnapshot: '{"description":"Men rạn trơn"}',
    proposedSpecSnapshot: '{"description":"Khắc chữ Tâm","imageUrls":["https://example.com/ref.jpg"]}',
    requestReason: 'Tặng người thân',
    status: 'PENDING_REVIEW',
    createdAt: '2026-10-15T10:00:00',
    currentSpecVersion: 1,
    itemProductionStatus: 'INITIAL_IN_PROGRESS',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OrderService],
    });

    service = TestBed.inject(OrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('startProduction', () => {
    it('should POST without a body and retain the Idempotency-Key header', () => {
      const orderId = 206;
      const idempotencyKey = 'idemp-start-production-206';
      const response = {
        orderId,
        orderVersion: 6,
        status: 'ORDER_CREATING',
        productionStartedAt: '2026-10-24T09:00:00Z',
        itemDeadlines: [],
      };

      service.startProduction(orderId, idempotencyKey).subscribe((result) => {
        expect(result).toEqual(response);
      });

      const req = httpMock.expectOne(`${baseUrl}/staff/${orderId}/start-production`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      expect(req.request.headers.get('Idempotency-Key')).toBe(idempotencyKey);
      req.flush({ success: true, status: 200, message: 'OK', data: response });
    });
  });

  describe('getChangeRequests', () => {
    it('should GET /api/orders/{orderId}/change-requests and unwrap ApiResponse', () => {
      const orderId = 50;
      const apiResponse: ApiResponse<OrderChangeRequest[]> = {
        success: true,
        status: 200,
        message: 'OK',
        data: [mockChangeRequest],
      };

      service.getChangeRequests(orderId).subscribe((res) => {
        expect(res).toEqual([mockChangeRequest]);
      });

      const req = httpMock.expectOne(`${baseUrl}/${orderId}/change-requests`);
      expect(req.request.method).toBe('GET');
      req.flush(apiResponse);
    });
  });

  describe('createChangeRequest', () => {
    it('should POST /api/orders/{orderId}/change-requests with Idempotency-Key and payload', () => {
      const orderId = 50;
      const customKey = 'idemp-custom-key-123';
      const requestPayload: CreateOrderChangeRequest = {
        orderVersion: 2,
        orderItemId: 15,
        baseSpecVersion: 1,
        proposedDescription: 'Khắc chữ Tâm',
        fieldValues: { height: 20 },
        reason: 'Tặng người thân',
      };

      const apiResponse: ApiResponse<OrderChangeRequest> = {
        success: true,
        status: 200,
        message: 'Yêu cầu chỉnh sửa đã được gửi.',
        data: mockChangeRequest,
      };

      service.createChangeRequest(orderId, requestPayload, customKey).subscribe((res) => {
        expect(res).toEqual(mockChangeRequest);
      });

      const req = httpMock.expectOne(`${baseUrl}/${orderId}/change-requests`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Idempotency-Key')).toBe(customKey);
      expect(req.request.body).toEqual(requestPayload);
      req.flush(apiResponse);
    });

    it('should auto-generate Idempotency-Key if not provided', () => {
      const orderId = 50;
      const requestPayload: CreateOrderChangeRequest = {
        orderVersion: 2,
        orderItemId: 15,
        baseSpecVersion: 1,
        proposedDescription: 'Khắc chữ Tâm',
        fieldValues: {},
        reason: 'Tặng người thân',
      };

      service.createChangeRequest(orderId, requestPayload).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/${orderId}/change-requests`);
      const key = req.request.headers.get('Idempotency-Key');
      expect(key).toBeTruthy();
      expect(key).toContain(`user-change-request-${orderId}-`);
      req.flush({ success: true, status: 200, message: 'OK', data: mockChangeRequest });
    });
  });

  describe('decideChangeRequest', () => {
    it('should POST /api/orders/staff/{orderId}/change-requests/{changeRequestId}/decision with Idempotency-Key and payload', () => {
      const orderId = 50;
      const changeRequestId = 101;
      const customKey = 'idemp-decision-key-456';
      const requestPayload: DecideOrderChangeRequest = {
        orderVersion: 2,
        changeRequestVersion: 0,
        decision: 'ACCEPT',
        reason: null,
      };

      const appliedChangeRequest: OrderChangeRequest = {
        ...mockChangeRequest,
        status: 'APPLIED',
        version: 1,
        appliedVersion: 2,
      };

      const apiResponse: ApiResponse<OrderChangeRequest> = {
        success: true,
        status: 200,
        message: 'Yêu cầu chỉnh sửa đã được xử lý.',
        data: appliedChangeRequest,
      };

      service.decideChangeRequest(orderId, changeRequestId, requestPayload, customKey).subscribe((res) => {
        expect(res).toEqual(appliedChangeRequest);
      });

      const req = httpMock.expectOne(`${baseUrl}/staff/${orderId}/change-requests/${changeRequestId}/decision`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Idempotency-Key')).toBe(customKey);
      expect(req.request.body).toEqual(requestPayload);
      req.flush(apiResponse);
    });
  });

  describe('generateIdempotencyKey', () => {
    it('should create scoped, unique idempotency keys', () => {
      const key1 = service.generateIdempotencyKey('user-change-request', 10);
      const key2 = service.generateIdempotencyKey('user-change-request', 10);
      expect(key1).toContain('user-change-request-10-');
      expect(key2).toContain('user-change-request-10-');
      expect(key1).not.toEqual(key2);
    });
  });

  // ==========================================
  // PHẦN 12 TEST SUITES
  // ==========================================

  describe('shippingHandover (WF07)', () => {
    it('should POST /api/orders/staff/{orderId}/shipping-handover with Idempotency-Key and payload', () => {
      const orderId = 88;
      const customKey = 'idemp-handover-key-88';
      const requestPayload: ShippingHandoverRequest = {
        orderVersion: 3,
        items: [
          { orderItemId: 501, exportedQuantity: 2 },
          { orderItemId: 502, exportedQuantity: 1 },
        ],
        handoverNote: 'Đã bàn giao cho shipper GHTK',
      };

      const mockResponse: ShippingHandoverResponse = {
        orderId,
        orderVersion: 4,
        status: 'SHIPPING',
        shippingStartedAt: '2026-10-16T14:00:00',
        expectedShippingDays: 2,
        expectedDeliveryAt: '2026-10-18T14:00:00',
        items: [
          { orderItemId: 501, orderedQuantity: 2, exportedQuantity: 2 },
          { orderItemId: 502, orderedQuantity: 1, exportedQuantity: 1 },
        ],
      };

      const apiResponse: ApiResponse<ShippingHandoverResponse> = {
        success: true,
        status: 200,
        message: 'Shipping handover recorded.',
        data: mockResponse,
      };

      service.shippingHandover(orderId, requestPayload, customKey).subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/staff/${orderId}/shipping-handover`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Idempotency-Key')).toBe(customKey);
      expect(req.request.body).toEqual(requestPayload);
      req.flush(apiResponse);
    });
  });

  describe('getReceiptView and confirmReceipt (WF08 USER)', () => {
    it('should GET /api/orders/{orderId}/receipt and unwrap ApiResponse', () => {
      const orderId = 99;
      const mockReceiptView: ReceiptViewDTO = {
        orderId,
        orderVersion: 5,
        orderType: 'CATALOG',
        status: 'SHIPPING',
        shippingStartedAt: '2026-10-16T10:00:00',
        expectedShippingDays: 2,
        expectedDeliveryAt: '2026-10-18T10:00:00',
        deliveredAt: null,
        canConfirmReceipt: true,
        dataWarning: null,
        items: [
          {
            orderItemId: 601,
            variantId: 12,
            productName: 'Chén gốm hoa lam',
            variantName: 'Men bóng',
            orderedQuantity: 2,
            exportedQuantity: 2,
            receivedQuantity: null,
          },
        ],
      };

      service.getReceiptView(orderId).subscribe((res) => {
        expect(res).toEqual(mockReceiptView);
      });

      const req = httpMock.expectOne(`${baseUrl}/${orderId}/receipt`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, status: 200, message: 'OK', data: mockReceiptView });
    });

    it('should POST /api/orders/{orderId}/receipt with Idempotency-Key and payload', () => {
      const orderId = 99;
      const customKey = 'idemp-receipt-user-99';
      const requestPayload: ReceiptConfirmRequest = {
        orderVersion: 5,
        receivedItems: [{ orderItemId: 601, receivedQuantity: 2 }],
        acceptMismatch: false,
        note: null,
      };

      const mockResponse: ReceiptConfirmResponse = {
        orderId,
        orderVersion: 6,
        status: 'DELIVERED',
        matched: true,
        completed: true,
        mismatchAccepted: false,
        confirmedAt: '2026-10-16T15:00:00',
        message: 'Xác nhận nhận hàng thành công.',
        mismatches: [],
      };

      service.confirmReceipt(orderId, requestPayload, customKey).subscribe((res) => {
        expect(res).toEqual(mockResponse);
        expect(res.completed).toBeTrue();
      });

      const req = httpMock.expectOne(`${baseUrl}/${orderId}/receipt`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Idempotency-Key')).toBe(customKey);
      expect(req.request.body).toEqual(requestPayload);
      req.flush({ success: true, status: 200, message: 'OK', data: mockResponse });
    });
  });

  describe('getGuestReceiptView and confirmGuestReceipt (WF08 GUEST)', () => {
    it('should GET /api/guest/orders/{orderId}/receipt?token=... without token in path or headers', () => {
      const orderId = 100;
      const token = 'guest-secure-token-abc';
      const mockReceiptView: ReceiptViewDTO = {
        orderId,
        orderVersion: 2,
        orderType: 'CATALOG',
        status: 'SHIPPING',
        shippingStartedAt: '2026-10-16T11:00:00',
        expectedShippingDays: 2,
        expectedDeliveryAt: '2026-10-18T11:00:00',
        deliveredAt: null,
        canConfirmReceipt: true,
        dataWarning: null,
        items: [],
      };

      service.getGuestReceiptView(orderId, token).subscribe((res) => {
        expect(res).toEqual(mockReceiptView);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/guest/orders/${orderId}/receipt?token=${token}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('token')).toBe(token);
      req.flush({ success: true, status: 200, message: 'OK', data: mockReceiptView });
    });

    it('should POST /api/guest/orders/{orderId}/receipt?token=... with Idempotency-Key and payload', () => {
      const orderId = 100;
      const token = 'guest-secure-token-abc';
      const customKey = 'idemp-guest-receipt-100';
      const requestPayload: ReceiptConfirmRequest = {
        orderVersion: 2,
        receivedItems: [{ orderItemId: 701, receivedQuantity: 1 }],
        acceptMismatch: true,
        note: null,
      };

      const mockResponse: ReceiptConfirmResponse = {
        orderId,
        orderVersion: 3,
        status: 'DELIVERED',
        matched: false,
        completed: true,
        mismatchAccepted: true,
        confirmedAt: '2026-10-16T16:00:00',
        message: 'Đã hoàn tất đơn hàng với chênh lệch được chấp nhận.',
        mismatches: [],
      };

      service.confirmGuestReceipt(orderId, token, requestPayload, customKey).subscribe((res) => {
        expect(res).toEqual(mockResponse);
        expect(res.completed).toBeTrue();
        expect(res.mismatchAccepted).toBeTrue();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/guest/orders/${orderId}/receipt?token=${token}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Idempotency-Key')).toBe(customKey);
      expect(req.request.params.get('token')).toBe(token);
      expect(req.request.body).toEqual(requestPayload);
      req.flush({ success: true, status: 200, message: 'OK', data: mockResponse });
    });
  });

  describe('reorder (F17)', () => {
    it('should POST /api/orders/{orderId}/reorder with Idempotency-Key and null body', () => {
      const orderId = 105;
      const customKey = 'idemp-reorder-105';
      const mockReorderResponse: ReorderResponseDTO = {
        orderType: 'CATALOG',
        customDraftId: null,
        addedItemCount: 2,
        skippedItemCount: 1,
        addedItems: [{ orderItemId: 801, variantId: 5, variantName: 'Bình hoa', quantity: 1, skipReason: null }],
        skippedItems: [{ orderItemId: 802, variantId: 6, variantName: 'Đĩa gốm', quantity: 1, skipReason: 'Out of stock' }],
      };

      service.reorder(orderId, customKey).subscribe((res) => {
        expect(res).toEqual(mockReorderResponse);
        expect(res.addedItemCount).toBe(2);
        expect(res.skippedItemCount).toBe(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/${orderId}/reorder`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Idempotency-Key')).toBe(customKey);
      expect(req.request.body).toBeNull();
      req.flush({ success: true, status: 200, message: 'OK', data: mockReorderResponse });
    });
  });

  describe('cancelOrder', () => {
    it('should POST the versioned cancellation payload with an idempotency key', () => {
      const orderId = 25;
      const orderVersion = 0;
      const reason = 'Customer requested cancellation';
      const result = {
        orderId,
        orderVersion: 1,
        status: 'CANCELLED',
        cancellationSource: 'USER',
        reason,
        reputationPenalty: 0,
        voucherRestored: false,
        assignmentReleased: false,
        cancelledAt: '2026-10-26T10:00:00',
      };

      service.cancelOrder(orderId, orderVersion, reason).subscribe((response) => {
        expect(response).toEqual(result);
      });

      const req = httpMock.expectOne(`${baseUrl}/${orderId}/cancellation`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ orderVersion, reason });
      expect(req.request.headers.get('Idempotency-Key')).toContain(`user-cancel-${orderId}-`);
      req.flush({ success: true, status: 200, message: 'OK', data: result });
    });
  });
});
