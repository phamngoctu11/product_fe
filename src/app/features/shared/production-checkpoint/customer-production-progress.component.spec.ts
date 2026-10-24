import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CustomerProductionProgressComponent } from './customer-production-progress.component';
import { ProductionCheckpointService } from '../../../service/production-checkpoint.service';
import { OrderItemProductionDTO } from '../../../model/production-checkpoint.model';

describe('CustomerProductionProgressComponent', () => {
  let component: CustomerProductionProgressComponent;
  let fixture: ComponentFixture<CustomerProductionProgressComponent>;
  let mockCheckpointService: jasmine.SpyObj<ProductionCheckpointService>;

  const mockItems: OrderItemProductionDTO[] = [
    {
      orderItemId: 101,
      productName: 'Bình hoa gốm',
      variantName: 'Men rạn xanh',
      quantity: 10,
      productionDurationDays: 3,
      computedCompletionAt: '2026-10-20T17:00:00Z',
      productionStatus: 'FINAL_IN_PROGRESS',
      checkpoints: [
        {
          id: 1,
          orderItemId: 101,
          stage: 'INITIAL_SHAPE',
          status: 'PASSED',
          attemptNumber: 1,
          note: 'Đã hoàn thiện tạo hình phôi',
          managerReviewRequired: false,
          submittedAt: '2026-10-16T08:00:00Z',
          images: [{ imageUrl: 'https://example.com/initial.jpg' }],
          version: 1,
        },
      ],
    },
  ];

  beforeEach(async () => {
    mockCheckpointService = jasmine.createSpyObj('ProductionCheckpointService', [
      'getProgress',
      'getGuestProgress',
    ]);
    mockCheckpointService.getProgress.and.returnValue(of(mockItems));
    mockCheckpointService.getGuestProgress.and.returnValue(of(mockItems));

    await TestBed.configureTestingModule({
      imports: [CustomerProductionProgressComponent],
      providers: [
        { provide: ProductionCheckpointService, useValue: mockCheckpointService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerProductionProgressComponent);
    component = fixture.componentInstance;
    component.orderId = 10;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should load authenticated progress when guestToken is absent', () => {
    component.guestToken = null;
    component.ngOnInit();
    expect(mockCheckpointService.getProgress).toHaveBeenCalledWith(10);
    expect(component.items.length).toBe(1);
  });

  it('should load guest progress when guestToken is present', () => {
    component.guestToken = 'signed-guest-token';
    component.ngOnInit();
    expect(mockCheckpointService.getGuestProgress).toHaveBeenCalledWith(10, 'signed-guest-token');
    expect(component.items.length).toBe(1);
  });

  it('should only return INITIAL_SHAPE checkpoint for customer view', () => {
    const item = mockItems[0];
    const initialCp = component.getInitialShapeCheckpoint(item);
    expect(initialCp).toBeTruthy();
    expect(initialCp?.stage).toBe('INITIAL_SHAPE');
    expect(initialCp?.note).toBe('Đã hoàn thiện tạo hình phôi');
  });

  it('should render INITIAL_SHAPE details without any review/approval buttons', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Bình hoa gốm');
    expect(compiled.textContent).toContain('Đã hoàn thành tạo dáng ban đầu');
    // Ensure no approve/reject/review buttons exist in customer UI
    expect(compiled.querySelector('button.btn-success')).toBeNull();
    expect(compiled.querySelector('button.btn-danger')).toBeNull();
  });

  it('should never render FINAL_PRODUCT decision details in the customer view', () => {
    fixture.detectChanges();
    component.items = [{
      ...mockItems[0],
      checkpoints: [
        ...mockItems[0].checkpoints,
        {
          id: 2,
          orderItemId: 101,
          stage: 'FINAL_PRODUCT',
          status: 'REWORK_REQUIRED',
          attemptNumber: 1,
          note: 'Ghi chú nội bộ KCS',
          managerReviewRequired: true,
          submittedAt: '2026-10-17T08:00:00Z',
          images: [{ imageUrl: 'https://example.com/final.jpg' }],
          decision: { decisionType: 'REWORK_REQUIRED', reason: 'Lý do nội bộ' },
          version: 2,
        },
      ],
    }];
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('Ghi chú nội bộ KCS');
    expect(text).not.toContain('Lý do nội bộ');
  });
});
