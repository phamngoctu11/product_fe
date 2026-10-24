import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminOrderComponent } from './admin-order.component';
import { OrderService } from '../../../service/order.service';
import { ProductionCheckpointService } from '../../../service/production-checkpoint.service';
import { ToastService } from '../../../service/toast.service';
import { ActionDialogService } from '../../../service/action-dialog.service';
import {
  AvailableStaff,
  ManagerOrderReviewSummary,
  Order,
  OrderAssignmentQueueItem,
} from '../../../model/order.model';
import { PageResponse } from '../../../model/page-response.model';
import { OrderItemProductionDTO, ReviewProductionCheckpointResultDTO } from '../../../model/production-checkpoint.model';

function mockPageResponse<T>(content: T[] = []): PageResponse<T> {
  return {
    content,
    pageable: {},
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
    first: true,
    last: true,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}

describe('AdminOrderComponent', () => {
  let component: AdminOrderComponent;
  let fixture: ComponentFixture<AdminOrderComponent>;
  let mockOrderService: jasmine.SpyObj<OrderService>;
  let mockCheckpointService: jasmine.SpyObj<ProductionCheckpointService>;
  let mockToast: jasmine.SpyObj<ToastService>;
  let mockActionDialog: jasmine.SpyObj<ActionDialogService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockOrder: Order = {
    id: 101,
    status: 'ORDER_CREATING',
    version: 3,
    totalPrice: 500000,
    finalPrice: 500000,
    orderType: 'CUSTOM',
    customerName: 'Trần Văn B',
    startOrderTime: '2026-10-15T08:00:00Z',
    cancelReason: null,
    note: null,
    items: [
      {
        id: 1,
        productId: 10,
        productName: 'Ấm trà gốm mộc',
        quantity: 2,
        price: 250000,
      },
    ],
  };

  const mockCheckpoints: OrderItemProductionDTO[] = [
    {
      orderItemId: 1,
      productName: 'Ấm trà gốm mộc',
      quantity: 2,
      productionDurationDays: 3,
      computedCompletionAt: '2026-10-20T10:00:00Z',
      productionStatus: 'FINAL_WAITING_QC',
      checkpoints: [
        {
          id: 10,
          orderItemId: 1,
          stage: 'FINAL_PRODUCT',
          status: 'PENDING_REVIEW',
          attemptNumber: 1,
          note: 'Sản phẩm hoàn thiện đã hoàn tất nung',
          managerReviewRequired: true,
          submittedAt: '2026-10-18T12:00:00Z',
          images: [{ imageUrl: 'https://example.com/item1.jpg' }],
          version: 1,
        },
      ],
    },
  ];

  beforeEach(async () => {
    mockOrderService = jasmine.createSpyObj('OrderService', [
      'getManagerReviews',
      'getManagerAssignmentQueue',
      'getAvailableStaff',
      'getById',
      'getManagerReviewDetail',
      'reviewOrder',
      'assignStaff',
    ]);
    mockCheckpointService = jasmine.createSpyObj('ProductionCheckpointService', [
      'getProgress',
      'reviewCheckpoint',
      'generateIdempotencyKey',
    ]);
    mockToast = jasmine.createSpyObj('ToastService', ['notify']);
    mockActionDialog = jasmine.createSpyObj('ActionDialogService', ['confirm', 'prompt']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockOrderService.getManagerReviews.and.returnValue(of(mockPageResponse<ManagerOrderReviewSummary>([])));
    mockOrderService.getManagerAssignmentQueue.and.returnValue(of(mockPageResponse<OrderAssignmentQueueItem>([])));
    mockOrderService.getAvailableStaff.and.returnValue(of(mockPageResponse<AvailableStaff>([])));
    mockOrderService.getById.and.returnValue(of(mockOrder));
    mockCheckpointService.getProgress.and.returnValue(of(mockCheckpoints));
    mockCheckpointService.generateIdempotencyKey.and.returnValue('key-123');

    await TestBed.configureTestingModule({
      imports: [AdminOrderComponent],
      providers: [
        { provide: OrderService, useValue: mockOrderService },
        { provide: ProductionCheckpointService, useValue: mockCheckpointService },
        { provide: ToastService, useValue: mockToast },
        { provide: ActionDialogService, useValue: mockActionDialog },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create AdminOrderComponent', () => {
    expect(component).toBeTruthy();
    expect(component.activeTab).toBe('reviews');
  });

  it('should switch to kcs tab and retain tab state', () => {
    component.selectTab('kcs');
    expect(component.activeTab).toBe('kcs');
  });

  it('should search order and load checkpoints in kcs tab', () => {
    component.selectTab('kcs');
    component.searchKcsOrder(101);

    expect(mockOrderService.getById).toHaveBeenCalledWith(101);
    expect(mockCheckpointService.getProgress).toHaveBeenCalledWith(101);
    expect(component.kcsOrder).toEqual(mockOrder);
    expect(component.kcsItemsProgress.length).toBe(1);
    expect(component.getPendingKcsCount()).toBe(1);
  });

  it('should open and close KCS review dialog', () => {
    component.openKcsReview(101);
    expect(component.isKcsDialogOpen).toBeTrue();
    expect(component.kcsOrderId).toBe(101);

    component.closeKcsDialog();
    expect(component.isKcsDialogOpen).toBeFalse();
    expect(component.kcsOrderId).toBeNull();
  });

  it('should handle quickCheckKcs from header input', () => {
    component.quickKcsOrderId = 101;
    component.quickCheckKcs();

    expect(component.isKcsDialogOpen).toBeTrue();
    expect(component.kcsOrderId).toBe(101);
  });

  it('should update order status when KCS review completes', () => {
    component.kcsOrder = { ...mockOrder, status: 'ORDER_CREATING', version: 3 };

    const reviewResult: ReviewProductionCheckpointResultDTO = {
      checkpoint: mockCheckpoints[0].checkpoints[0],
      orderId: 101,
      orderVersion: 4,
      orderStatus: 'READY_TO_SHIP',
      itemProductionStatus: 'READY',
      remainingOrderItemIds: [],
      assignmentReleased: true,
    };

    component.onKcsReviewed(reviewResult);

    expect(component.kcsOrder.status).toBe('READY_TO_SHIP');
    expect(component.kcsOrder.version).toBe(4);
    expect(mockCheckpointService.getProgress).toHaveBeenCalledWith(101);
  });
});
