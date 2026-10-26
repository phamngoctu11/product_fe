import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Order, OrderChangeRequest } from '../../../model/order.model';
import { ActionDialogService } from '../../../service/action-dialog.service';
import { OrderService } from '../../../service/order.service';
import { ToastService } from '../../../service/toast.service';
import { ChangeRequestPanelComponent } from './change-request-panel.component';

describe('ChangeRequestPanelComponent', () => {
  let fixture: ComponentFixture<ChangeRequestPanelComponent>;
  let component: ChangeRequestPanelComponent;
  let orderService: jasmine.SpyObj<OrderService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let dialogService: jasmine.SpyObj<ActionDialogService>;

  const order: Order = {
    id: 10,
    version: 3,
    userId: 'user-123',
    status: 'ORDER_CREATING',
    totalPrice: 200,
    finalPrice: 200,
    startOrderTime: '2026-10-15T09:00:00',
    cancelReason: null,
    note: null,
    items: [{
      orderItemId: 20,
      productId: 1,
      productName: 'Bình gốm',
      quantity: 1,
      price: 200,
      productionStatus: 'INITIAL_IN_PROGRESS',
      specVersion: 1,
      description: 'Màu xanh',
      productTypeName: 'Đồ gốm',
      productTypeFields: [{ code: 'height', label: 'Chiều cao', kind: 'NUMBER', unit: 'cm', minimum: 1, maximum: 50 }],
      fieldValues: { height: 18 },
    }],
  };

  const pending: OrderChangeRequest = {
    id: 100,
    version: 0,
    orderId: 10,
    orderVersion: 3,
    orderItemId: 20,
    productName: 'Bình gốm',
    variantName: 'Xanh ngọc',
    ownerId: 'user-123',
    assignedStaffId: 'staff-456',
    baseAgreementVersion: 1,
    baseSpecVersion: 1,
    baseSpecSnapshot: '{"productTypeFields":[{"code":"height","label":"Chiều cao","kind":"NUMBER","unit":"cm"}],"fieldValues":{"height":18}}',
    proposedSpecSnapshot: '{"description":"Khắc tên lên thân bình","fieldValues":{"height":20}}',
    requestReason: 'Làm quà tặng tân gia',
    status: 'PENDING_REVIEW',
    createdAt: '2026-10-15T10:00:00',
    currentSpecVersion: 1,
    itemProductionStatus: 'INITIAL_IN_PROGRESS',
  };

  beforeEach(async () => {
    orderService = jasmine.createSpyObj<OrderService>('OrderService', [
      'getChangeRequests', 'createChangeRequest', 'decideChangeRequest', 'generateIdempotencyKey',
    ]);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'warning', 'fromError']);
    dialogService = jasmine.createSpyObj<ActionDialogService>('ActionDialogService', ['confirm']);

    orderService.getChangeRequests.and.returnValue(of([]));
    orderService.generateIdempotencyKey.and.returnValue('stable-test-key');
    dialogService.confirm.and.returnValue(of(true));

    await TestBed.configureTestingModule({
      imports: [ChangeRequestPanelComponent],
      providers: [
        { provide: OrderService, useValue: orderService },
        { provide: ToastService, useValue: toastService },
        { provide: ActionDialogService, useValue: dialogService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangeRequestPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('order', structuredClone(order));
    fixture.componentRef.setInput('mode', 'USER');
    fixture.detectChanges();
  });

  // 1. USER gửi mô tả và thông số theo productType.
  it('USER tạo yêu cầu gồm mô tả và thông số theo productType', () => {
    orderService.createChangeRequest.and.returnValue(of(pending));
    component.selectedItemId = 20;
    component.selectItem();
    component.proposedDescription = 'Khắc tên lên thân bình';
    component.proposedFieldValues = { height: 20 };
    component.reason = 'Quà tặng tân gia';

    component.submit();

    expect(orderService.createChangeRequest).toHaveBeenCalledWith(10, {
      orderVersion: 3,
      orderItemId: 20,
      baseSpecVersion: 1,
      proposedDescription: 'Khắc tên lên thân bình',
      fieldValues: { height: 20 },
      reason: 'Quà tặng tân gia',
    }, 'stable-test-key');
    expect(component.requests[0].id).toBe(100);
    expect(toastService.success).toHaveBeenCalledWith('Đã gửi yêu cầu chỉnh sửa cho staff phụ trách.');
  });

  // 3. Chỉ item có ID và còn trong giai đoạn sản xuất mới xuất hiện.
  it('Chỉ item còn trong giai đoạn sản xuất mới xuất hiện', () => {
    const orderWithMixedItems: Order = {
      ...order,
      items: [
        { orderItemId: 1, productId: 1, productName: 'Item hợp lệ 1', productionStatus: 'WAITING_ASSIGNMENT', quantity: 1, price: 100 },
        { orderItemId: 2, productId: 2, productName: 'Item hợp lệ 2', productionStatus: 'ASSIGNED', quantity: 1, price: 100 },
        { orderItemId: 3, productId: 3, productName: 'Item hợp lệ 3', productionStatus: 'INITIAL_IN_PROGRESS', quantity: 1, price: 100 },
        { orderItemId: 4, productId: 4, productName: 'Item hợp lệ 4', productionStatus: 'FINAL_IN_PROGRESS', quantity: 1, price: 100 },
        { orderItemId: 5, productId: 5, productName: 'Item vẫn đang sản xuất', productionStatus: 'INITIAL_IN_PROGRESS', quantity: 1, price: 100 },
        { orderItemId: 6, productId: 6, productName: 'Item đã QC', productionStatus: 'FINAL_WAITING_QC', quantity: 1, price: 100 },
        { orderItemId: 7, productId: 7, productName: 'Item cần sửa', productionStatus: 'FINAL_REWORK_REQUIRED', quantity: 1, price: 100 },
        { orderItemId: 8, productId: 8, productName: 'Item đã sẵn sàng', productionStatus: 'READY', quantity: 1, price: 100 },
        { orderItemId: 9, productId: 9, productName: 'Item không cần sx', productionStatus: 'NOT_REQUIRED', quantity: 1, price: 100 },
      ],
    };
    fixture.componentRef.setInput('order', orderWithMixedItems);
    fixture.detectChanges();

    const eligible = component.eligibleItems;
    expect(eligible.length).toBe(5);
    expect(eligible.map(i => i.orderItemId)).toEqual([1, 2, 3, 4, 5]);
  });

  // 4. STAFF ACCEPT gửi đúng orderVersion và changeRequestVersion sau khi confirm dialog
  it('STAFF ACCEPT gửi đúng orderVersion và changeRequestVersion sau khi confirm', () => {
    const applied: OrderChangeRequest = { ...pending, status: 'APPLIED', version: 1, appliedVersion: 2 };
    fixture.componentRef.setInput('mode', 'STAFF');
    component.requests = [pending];
    orderService.decideChangeRequest.and.returnValue(of(applied));

    component.decide(pending, 'ACCEPT');

    expect(dialogService.confirm).toHaveBeenCalled();
    expect(orderService.decideChangeRequest).toHaveBeenCalledWith(10, 100, {
      orderVersion: 3,
      changeRequestVersion: 0,
      decision: 'ACCEPT',
      reason: null,
    }, 'stable-test-key');
    expect(component.requests[0].status).toBe('APPLIED');
    expect(toastService.success).toHaveBeenCalledWith('Đã áp dụng đặc tả mới.');
  });

  // 4b. STAFF ACCEPT khi dialog cancel thì không gọi decideChangeRequest
  it('STAFF ACCEPT hủy bỏ xác nhận thì không gửi request', () => {
    dialogService.confirm.and.returnValue(of(false));
    fixture.componentRef.setInput('mode', 'STAFF');
    component.requests = [pending];

    component.decide(pending, 'ACCEPT');

    expect(dialogService.confirm).toHaveBeenCalled();
    expect(orderService.decideChangeRequest).not.toHaveBeenCalled();
    expect(component.decidingId).toBeNull();
  });

  // 5. STAFF REJECT không có reason bị chặn tại UI
  it('STAFF REJECT không có reason bị chặn tại UI', () => {
    fixture.componentRef.setInput('mode', 'STAFF');
    component.requests = [pending];
    component.decisionReasons[pending.id] = '   ';

    component.decide(pending, 'REJECT');

    expect(toastService.warning).toHaveBeenCalledWith('Vui lòng nhập lý do từ chối.');
    expect(orderService.decideChangeRequest).not.toHaveBeenCalled();
  });

  // 6. Sau 409 component reload dữ liệu
  it('Sau 409 component reload dữ liệu và thông báo cho cha', () => {
    fixture.componentRef.setInput('mode', 'STAFF');
    component.requests = [pending];
    component.decisionReasons[pending.id] = 'Chi tiết này đã hoàn thành';
    orderService.decideChangeRequest.and.returnValue(throwError(() => ({
      status: 409,
      error: { message: 'CHANGE_REQUEST_ITEM_ALREADY_IMPLEMENTED' },
    })));
    spyOn(component.changed, 'emit');

    component.decide(pending, 'REJECT');

    // Initial load: 1, after 409: 2
    expect(orderService.getChangeRequests).toHaveBeenCalledTimes(2);
    expect(component.changed.emit).toHaveBeenCalled();
    expect(toastService.fromError).toHaveBeenCalled();
  });

  // 7. Không hiển thị form USER cho Guest
  it('Không hiển thị form USER cho Guest', () => {
    const guestOrder: Order = {
      ...order,
      userId: null,
      user_id: null,
      guestSessionId: 'guest-session-uuid',
      customer: { guest: true, userId: null },
    };
    fixture.componentRef.setInput('order', guestOrder);
    fixture.componentRef.setInput('mode', 'USER');
    fixture.detectChanges();

    expect(component.isGuest).toBeTrue();
    expect(component.canCreate).toBeFalse();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.request-form')).toBeNull();
    expect(compiled.textContent).toContain('Đơn hàng của khách vãng lai không áp dụng yêu cầu chỉnh sửa đặc tả');
  });

  // 8. APPLIED hiển thị appliedVersion
  it('APPLIED hiển thị appliedVersion', () => {
    const appliedRequest: OrderChangeRequest = {
      ...pending,
      status: 'APPLIED',
      version: 1,
      appliedVersion: 2,
    };
    component.requests = [appliedRequest];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Đã tạo spec v2');
  });

  it('chặn thông số vượt giới hạn do manager cấu hình', () => {
    component.selectedItemId = 20;
    component.selectItem();
    component.proposedDescription = 'Thay đổi';
    component.reason = 'Lý do';
    component.proposedFieldValues = { height: 51 };

    component.submit();

    expect(orderService.createChangeRequest).not.toHaveBeenCalled();
    expect(component.submitting).toBeFalse();
    expect(toastService.warning).toHaveBeenCalledWith('Vui lòng nhập giá trị hợp lệ cho trường “Chiều cao”.');
  });

  // Bổ sung: 403 Forbidden ẩn form và hiển thị alert
  it('xử lý lỗi 403 Forbidden', () => {
    orderService.getChangeRequests.and.returnValue(throwError(() => ({
      status: 403,
      error: { message: 'CHANGE_REQUEST_FORBIDDEN' },
    })));

    component.load();
    fixture.detectChanges();

    expect(component.isForbidden).toBeTrue();
    expect(component.canCreate).toBeFalse();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Bạn không còn quyền truy cập hoặc thực hiện thao tác');
  });

  // Bổ sung: Tái sử dụng idempotency key khi retry cùng payload
  it('tái sử dụng idempotency key khi submit lại cùng payload sau lỗi transient', () => {
    let callCount = 0;
    orderService.generateIdempotencyKey.and.callFake(() => `key-${++callCount}`);
    orderService.createChangeRequest.and.returnValue(throwError(() => ({ status: 500, error: { message: 'Network error' } })));

    component.selectedItemId = 20;
    component.selectItem();
    component.proposedDescription = 'Mô tả A';
    component.reason = 'Lý do A';
    component.proposedFieldValues = { height: 20 };

    // Lần 1 thất bại do lỗi 500
    component.submit();
    expect(orderService.createChangeRequest).toHaveBeenCalledWith(10, jasmine.anything(), 'key-1');

    // Lần 2 retry với payload không đổi
    orderService.createChangeRequest.and.returnValue(of(pending));
    component.submit();
    // Giữ nguyên key-1, không tạo key-2
    expect(orderService.createChangeRequest).toHaveBeenCalledWith(10, jasmine.anything(), 'key-1');
  });
});
