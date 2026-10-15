import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ManagerKcsDialogComponent } from './manager-kcs-dialog.component';
import { ProductionCheckpointService } from '../../../service/production-checkpoint.service';
import { ToastService } from '../../../service/toast.service';
import { OrderItemProductionDTO, ReviewProductionCheckpointResultDTO } from '../../../model/production-checkpoint.model';

describe('ManagerKcsDialogComponent', () => {
  let component: ManagerKcsDialogComponent;
  let fixture: ComponentFixture<ManagerKcsDialogComponent>;
  let mockCheckpointService: jasmine.SpyObj<ProductionCheckpointService>;
  let mockToast: jasmine.SpyObj<ToastService>;

  const mockItems: OrderItemProductionDTO[] = [
    {
      orderItemId: 501,
      productName: 'Chén trà men ngọc',
      quantity: 20,
      handmade: true,
      productionDurationDays: 2,
      computedCompletionAt: '2026-10-18T10:00:00Z',
      productionStatus: 'FINAL_WAITING_QC',
      checkpoints: [
        {
          id: 1,
          orderItemId: 501,
          stage: 'INITIAL_SHAPE',
          status: 'PASSED',
          attemptNumber: 1,
          note: 'Tạo dáng xong',
          managerReviewRequired: false,
          submittedAt: '2026-10-16T08:00:00Z',
          images: [{ imageUrl: 'https://example.com/shape.jpg' }],
          version: 1,
        },
        {
          id: 2,
          orderItemId: 501,
          stage: 'FINAL_PRODUCT',
          status: 'PENDING_REVIEW',
          attemptNumber: 1,
          note: 'Sản phẩm đã nung xong men bóng',
          managerReviewRequired: true,
          submittedByName: 'Staff Nguyễn Văn A',
          submittedAt: '2026-10-17T14:00:00Z',
          images: [{ imageUrl: 'https://example.com/final1.jpg' }],
          version: 2,
        },
      ],
    },
  ];

  beforeEach(async () => {
    mockCheckpointService = jasmine.createSpyObj('ProductionCheckpointService', [
      'getProgress',
      'reviewCheckpoint',
      'generateIdempotencyKey',
    ]);
    mockToast = jasmine.createSpyObj('ToastService', ['notify', 'warning']);

    mockCheckpointService.getProgress.and.returnValue(of(mockItems));
    mockCheckpointService.generateIdempotencyKey.and.callFake((p?: string, id?: number | string) => `test-key-${id}`);

    await TestBed.configureTestingModule({
      imports: [ManagerKcsDialogComponent],
      providers: [
        { provide: ProductionCheckpointService, useValue: mockCheckpointService },
        { provide: ToastService, useValue: mockToast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManagerKcsDialogComponent);
    component = fixture.componentInstance;
    component.orderId = 10;
    component.isOpen = true;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should load progress on init when open', () => {
    component.loadProgress();
    expect(mockCheckpointService.getProgress).toHaveBeenCalledWith(10);
    expect(component.itemsProgress.length).toBe(1);
    expect(component.getPendingCount()).toBe(1);
  });

  it('should pass checkpoint with Idempotency-Key and handle READY_TO_SHIP result', () => {
    component.itemsProgress = mockItems;
    const checkpoint = mockItems[0].checkpoints[1];

    const passResult: ReviewProductionCheckpointResultDTO = {
      checkpoint: { ...checkpoint, status: 'PASSED' },
      orderId: 10,
      orderVersion: 5,
      orderStatus: 'READY_TO_SHIP',
      itemProductionStatus: 'READY',
      remainingOrderItemIds: [],
      assignmentReleased: true,
    };
    mockCheckpointService.reviewCheckpoint.and.returnValue(of(passResult));

    component.passCheckpoint(checkpoint);

    expect(mockCheckpointService.reviewCheckpoint).toHaveBeenCalledWith(
      10,
      checkpoint.id,
      { checkpointVersion: checkpoint.version, decision: 'PASS', reason: undefined },
      jasmine.any(String)
    );
    expect(component.lastReviewResult?.orderStatus).toBe('READY_TO_SHIP');
    expect(component.lastReviewResult?.assignmentReleased).toBeTrue();
    expect(mockToast.notify).toHaveBeenCalledWith(jasmine.stringMatching(/READY_TO_SHIP/));
  });

  it('should require reason when sending REWORK_REQUIRED', () => {
    component.itemsProgress = mockItems;
    const checkpoint = mockItems[0].checkpoints[1];

    // Reason empty
    component.reworkReasons[checkpoint.id] = '   ';
    component.confirmRework(checkpoint);
    expect(mockToast.notify).toHaveBeenCalledWith('Vui lòng nhập lý do yêu cầu làm lại.');
    expect(mockCheckpointService.reviewCheckpoint).not.toHaveBeenCalled();

    // Reason provided
    component.reworkReasons[checkpoint.id] = 'Màu men bị bọt khí, cần nung tráng lại';
    const reworkResult: ReviewProductionCheckpointResultDTO = {
      checkpoint: { ...checkpoint, status: 'REWORK_REQUIRED' },
      orderId: 10,
      orderVersion: 5,
      orderStatus: 'ORDER_CREATING',
      itemProductionStatus: 'FINAL_REWORK_REQUIRED',
      remainingOrderItemIds: [501],
      assignmentReleased: false,
    };
    mockCheckpointService.reviewCheckpoint.and.returnValue(of(reworkResult));

    component.confirmRework(checkpoint);

    expect(mockCheckpointService.reviewCheckpoint).toHaveBeenCalledWith(
      10,
      checkpoint.id,
      {
        checkpointVersion: checkpoint.version,
        decision: 'REWORK_REQUIRED',
        reason: 'Màu men bị bọt khí, cần nung tráng lại',
      },
      jasmine.any(String)
    );
    expect(component.lastReviewResult?.orderStatus).toBe('ORDER_CREATING');
  });

  it('should reload progress on 409 conflict error', () => {
    component.itemsProgress = mockItems;
    const checkpoint = mockItems[0].checkpoints[1];
    mockCheckpointService.reviewCheckpoint.and.returnValue(throwError(() => ({ status: 409 })));

    component.passCheckpoint(checkpoint);

    expect(mockToast.notify).toHaveBeenCalledWith(
      jasmine.stringMatching(/Dữ liệu checkpoint đã thay đổi/)
    );
    expect(mockCheckpointService.getProgress).toHaveBeenCalled();
  });

  it('should close the action dialog when manager permission is rejected', () => {
    const checkpoint = mockItems[0].checkpoints[1];
    const closeSpy = spyOn(component.close, 'emit');
    mockCheckpointService.reviewCheckpoint.and.returnValue(throwError(() => ({ status: 403 })));

    component.passCheckpoint(checkpoint);

    expect(closeSpy).toHaveBeenCalled();
    expect(mockToast.notify).toHaveBeenCalledWith(jasmine.stringMatching(/không có quyền/));
  });
});
