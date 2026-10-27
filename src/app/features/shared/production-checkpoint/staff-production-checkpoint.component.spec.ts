import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { StaffProductionCheckpointComponent } from './staff-production-checkpoint.component';
import { ProductionCheckpointService } from '../../../service/production-checkpoint.service';
import { ToastService } from '../../../service/toast.service';
import { OrderItemProductionDTO, ProductionCheckpointDTO } from '../../../model/production-checkpoint.model';

describe('StaffProductionCheckpointComponent', () => {
  let component: StaffProductionCheckpointComponent;
  let fixture: ComponentFixture<StaffProductionCheckpointComponent>;
  let mockCheckpointService: jasmine.SpyObj<ProductionCheckpointService>;
  let mockToast: jasmine.SpyObj<ToastService>;

  const mockItemWithQuantity20: OrderItemProductionDTO = {
    orderItemId: 301,
    productName: 'Tách trà gốm mộc',
    variantName: 'Màu nâu đất',
    quantity: 20, // Large quantity but only 1 checkpoint stepper
    productionDurationDays: 4,
    computedCompletionAt: '2026-10-22T17:00:00Z',
    productionStatus: 'INITIAL_IN_PROGRESS',
    checkpoints: [],
  };

  beforeEach(async () => {
    mockCheckpointService = jasmine.createSpyObj('ProductionCheckpointService', [
      'getProgress',
      'uploadImages',
      'submitCheckpoint',
      'generateIdempotencyKey',
    ]);
    mockToast = jasmine.createSpyObj('ToastService', ['notify', 'warning']);

    mockCheckpointService.getProgress.and.returnValue(of([mockItemWithQuantity20]));
    mockCheckpointService.generateIdempotencyKey.and.callFake((p?: string, id?: number | string) => `test-key-${id}`);

    await TestBed.configureTestingModule({
      imports: [StaffProductionCheckpointComponent],
      providers: [
        { provide: ProductionCheckpointService, useValue: mockCheckpointService },
        { provide: ToastService, useValue: mockToast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffProductionCheckpointComponent);
    component = fixture.componentInstance;
    component.orderId = 10;
    component.orderVersion = 1;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should display exactly one stepper card for an order item even with quantity 20', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Tách trà gốm mộc');
    expect(compiled.textContent).toContain('Số lượng: 20');
    // Exactly 1 item card rendered
    const itemCards = compiled.querySelectorAll('.card');
    expect(itemCards.length).toBe(1);
  });

  it('should translate every known production status instead of rendering enum codes', () => {
    mockCheckpointService.getProgress.and.returnValue(of([{
      ...mockItemWithQuantity20,
      productionStatus: 'WAITING_ASSIGNMENT',
    }]));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Chờ phân công');
    expect(text).not.toContain('WAITING_ASSIGNMENT');
  });

  it('should allow submitting INITIAL_SHAPE and auto-advance to FINAL_PRODUCT without waiting for manager review', () => {
    const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
    component.initialFiles[301] = [file];
    component.initialNotes[301] = 'Tạo phôi hoàn thành';

    mockCheckpointService.uploadImages.and.returnValue(of(['https://example.com/uploaded.jpg']));
    const passedInitial: ProductionCheckpointDTO = {
      id: 1,
      orderItemId: 301,
      stage: 'INITIAL_SHAPE',
      status: 'PASSED',
      attemptNumber: 1,
      note: 'Tạo phôi hoàn thành',
      managerReviewRequired: false,
      submittedAt: '2026-10-16T09:00:00Z',
      images: [{ imageUrl: 'https://example.com/uploaded.jpg' }],
      version: 1,
    };
    mockCheckpointService.submitCheckpoint.and.returnValue(of(passedInitial));

    component.submitInitialShape(mockItemWithQuantity20);

    expect(mockCheckpointService.uploadImages).toHaveBeenCalledWith([file]);
    expect(mockCheckpointService.submitCheckpoint).toHaveBeenCalledWith(
      10,
      301,
      {
        orderVersion: 1,
        stage: 'INITIAL_SHAPE',
        imageUrls: ['https://example.com/uploaded.jpg'],
        note: 'Tạo phôi hoàn thành',
      },
      jasmine.any(String)
    );
    expect(mockToast.notify).toHaveBeenCalledWith(jasmine.stringMatching(/gửi báo cáo tạo dáng ban đầu/));
  });

  it('should lock submit for FINAL_PRODUCT when status is PENDING_REVIEW', () => {
    const itemPendingReview: OrderItemProductionDTO = {
      ...mockItemWithQuantity20,
      productionStatus: 'FINAL_WAITING_QC',
      checkpoints: [
        {
          id: 1,
          orderItemId: 301,
          stage: 'INITIAL_SHAPE',
          status: 'PASSED',
          attemptNumber: 1,
          managerReviewRequired: false,
          submittedAt: '2026-10-16T09:00:00Z',
          images: [{ imageUrl: 'https://example.com/init.jpg' }],
          version: 1,
        },
        {
          id: 2,
          orderItemId: 301,
          stage: 'FINAL_PRODUCT',
          status: 'PENDING_REVIEW',
          attemptNumber: 1,
          managerReviewRequired: true,
          submittedAt: '2026-10-17T09:00:00Z',
          images: [{ imageUrl: 'https://example.com/final.jpg' }],
          version: 2,
        },
      ],
    };

    expect(component.isFinalPendingReview(itemPendingReview)).toBeTrue();
    expect(component.canSubmitFinal(itemPendingReview)).toBeFalse();
  });

  it('should allow submitting new attempt when latest FINAL_PRODUCT is REWORK_REQUIRED and display reason', () => {
    const itemReworkRequired: OrderItemProductionDTO = {
      ...mockItemWithQuantity20,
      productionStatus: 'FINAL_REWORK_REQUIRED',
      checkpoints: [
        {
          id: 1,
          orderItemId: 301,
          stage: 'INITIAL_SHAPE',
          status: 'PASSED',
          attemptNumber: 1,
          managerReviewRequired: false,
          submittedAt: '2026-10-16T09:00:00Z',
          images: [{ imageUrl: 'https://example.com/init.jpg' }],
          version: 1,
        },
        {
          id: 2,
          orderItemId: 301,
          stage: 'FINAL_PRODUCT',
          status: 'REWORK_REQUIRED',
          attemptNumber: 1,
          managerReviewRequired: true,
          submittedAt: '2026-10-17T09:00:00Z',
          images: [{ imageUrl: 'https://example.com/final1.jpg' }],
          decision: {
            decisionType: 'REWORK_REQUIRED',
            reason: 'Men bị loang, cần làm lại',
          },
          version: 3,
        },
      ],
    };

    expect(component.isFinalPendingReview(itemReworkRequired)).toBeFalse();
    expect(component.canSubmitFinal(itemReworkRequired)).toBeTrue();
    expect(component.getLatestFinalCheckpoint(itemReworkRequired)?.decision?.reason).toBe('Men bị loang, cần làm lại');
  });

  it('should reload progress on 409 conflict during final submit', () => {
    const file = new File(['dummy'], 'photo2.jpg', { type: 'image/jpeg' });
    component.finalFiles[301] = [file];
    mockCheckpointService.uploadImages.and.returnValue(of(['https://example.com/final2.jpg']));
    mockCheckpointService.submitCheckpoint.and.returnValue(throwError(() => ({ status: 409 })));

    component.submitFinalProduct(mockItemWithQuantity20);

    expect(mockToast.notify).toHaveBeenCalledWith(jasmine.stringMatching(/Dữ liệu đã thay đổi/));
    expect(mockCheckpointService.getProgress).toHaveBeenCalled();
  });

  it('should reuse the uploaded payload and idempotency key after an uncertain network failure', () => {
    const file = new File(['dummy'], 'retry.jpg', { type: 'image/jpeg' });
    component.initialFiles[301] = [file];
    component.initialNotes[301] = 'Giữ nguyên payload khi retry';
    mockCheckpointService.uploadImages.and.returnValue(of(['https://example.com/retry.jpg']));

    const response: ProductionCheckpointDTO = {
      id: 10,
      orderItemId: 301,
      stage: 'INITIAL_SHAPE',
      status: 'PASSED',
      attemptNumber: 1,
      managerReviewRequired: false,
      submittedAt: '2026-10-16T09:00:00Z',
      images: [{ imageUrl: 'https://example.com/retry.jpg' }],
      version: 0,
    };
    mockCheckpointService.submitCheckpoint.and.returnValues(
      throwError(() => ({ status: 0 })),
      of(response),
    );

    component.submitInitialShape(mockItemWithQuantity20);
    component.submitInitialShape(mockItemWithQuantity20);

    expect(mockCheckpointService.uploadImages).toHaveBeenCalledTimes(1);
    expect(mockCheckpointService.submitCheckpoint).toHaveBeenCalledTimes(2);
    const firstCall = mockCheckpointService.submitCheckpoint.calls.argsFor(0);
    const retryCall = mockCheckpointService.submitCheckpoint.calls.argsFor(1);
    expect(retryCall[2]).toEqual(firstCall[2]);
    expect(retryCall[3]).toBe(firstCall[3]);
  });

  it('should disable actions when the backend revokes staff access', () => {
    const file = new File(['dummy'], 'forbidden.jpg', { type: 'image/jpeg' });
    component.initialFiles[301] = [file];
    mockCheckpointService.uploadImages.and.returnValue(of(['https://example.com/forbidden.jpg']));
    mockCheckpointService.submitCheckpoint.and.returnValue(throwError(() => ({ status: 403 })));

    component.submitInitialShape(mockItemWithQuantity20);

    expect(component.accessDenied).toBeTrue();
    expect(mockToast.notify).toHaveBeenCalledWith(jasmine.stringMatching(/không còn quyền/));
  });
});
