import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Order, OrderChangeRequest } from '../../../model/order.model';
import { OrderService } from '../../../service/order.service';
import { ToastService } from '../../../service/toast.service';
import { UploadService } from '../../../service/upload.service';
import { ChangeRequestPanelComponent } from './change-request-panel.component';

describe('ChangeRequestPanelComponent', () => {
  let fixture: ComponentFixture<ChangeRequestPanelComponent>;
  let component: ChangeRequestPanelComponent;
  let orderService: jasmine.SpyObj<OrderService>;

  const order: Order = {
    id: 10,
    version: 3,
    status: 'ORDER_CREATING',
    totalPrice: 200,
    finalPrice: 200,
    startOrderTime: '2026-10-15T09:00:00',
    endOrderTime: null,
    cancelReason: null,
    note: null,
    items: [{
      orderItemId: 20,
      productId: 1,
      productName: 'Bình gốm',
      quantity: 1,
      price: 200,
      handmade: true,
      productionStatus: 'INITIAL_IN_PROGRESS',
      specVersion: 1,
      description: 'Màu xanh',
    }],
  };

  const pending: OrderChangeRequest = {
    id: 100,
    version: 0,
    orderId: 10,
    orderVersion: 3,
    orderItemId: 20,
    ownerId: 'owner',
    assignedStaffId: 'staff',
    baseAgreementVersion: 1,
    baseSpecVersion: 1,
    proposedSpecSnapshot: '{"description":"Khắc tên","imageUrls":[]}',
    requestReason: 'Làm quà',
    status: 'PENDING_REVIEW',
    createdAt: '2026-10-15T10:00:00',
    currentSpecVersion: 1,
    itemProductionStatus: 'INITIAL_IN_PROGRESS',
  };

  beforeEach(async () => {
    orderService = jasmine.createSpyObj<OrderService>('OrderService', [
      'getChangeRequests', 'createChangeRequest', 'decideChangeRequest', 'generateIdempotencyKey',
    ]);
    orderService.getChangeRequests.and.returnValue(of([]));
    orderService.generateIdempotencyKey.and.returnValue('stable-key');
    await TestBed.configureTestingModule({
      imports: [ChangeRequestPanelComponent],
      providers: [
        { provide: OrderService, useValue: orderService },
        { provide: UploadService, useValue: jasmine.createSpyObj('UploadService', ['uploadImage']) },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'warning', 'fromError']) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ChangeRequestPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('order', structuredClone(order));
    fixture.componentRef.setInput('mode', 'USER');
    fixture.detectChanges();
  });

  it('submits without requiring optional attachments', () => {
    orderService.createChangeRequest.and.returnValue(of(pending));
    component.selectedItemId = 20;
    component.proposedDescription = 'Khắc tên';
    component.reason = 'Làm quà';

    component.submit();

    expect(orderService.createChangeRequest).toHaveBeenCalledWith(10, jasmine.objectContaining({
      orderItemId: 20,
      baseSpecVersion: 1,
      proposedImageUrls: [],
    }), 'stable-key');
    expect(component.requests[0].id).toBe(100);
  });

  it('lets assigned staff accept a pending request with optimistic versions', () => {
    const applied = { ...pending, status: 'APPLIED' as const, version: 1, appliedVersion: 2 };
    fixture.componentRef.setInput('mode', 'STAFF');
    component.requests = [pending];
    orderService.decideChangeRequest.and.returnValue(of(applied));

    component.decide(pending, 'ACCEPT');

    expect(orderService.decideChangeRequest).toHaveBeenCalledWith(10, 100, {
      orderVersion: 3,
      changeRequestVersion: 0,
      decision: 'ACCEPT',
      reason: null,
    }, 'stable-key');
    expect(component.requests[0].status).toBe('APPLIED');
  });
});
