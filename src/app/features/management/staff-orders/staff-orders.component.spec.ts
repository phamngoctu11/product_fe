import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { StaffOrdersComponent } from './staff-orders.component';
import { OrderService } from '../../../service/order.service';
import { ToastService } from '../../../service/toast.service';
import { ActionDialogService } from '../../../service/action-dialog.service';
import { Order, OrderAssignmentQueueItem, OrderListDTO } from '../../../model/order.model';
import { PageResponse } from '../../../model/page-response.model';

describe('StaffOrdersComponent', () => {
  let fixture: ComponentFixture<StaffOrdersComponent>;
  let component: StaffOrdersComponent;
  let orderService: jasmine.SpyObj<OrderService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let actionDialogService: jasmine.SpyObj<ActionDialogService>;

  const mockClaimableOrders: OrderAssignmentQueueItem[] = [
    {
      orderId: 101,
      orderVersion: 1,
      orderType: 'CUSTOM',
      status: 'WAITING_STAFF_CONFIRMATION',
      paymentStatus: 'PAID',
      paymentMethod: 'ONLINE',
      finalPrice: 500000,
      customerName: 'Nguyễn Văn A',
      createdAt: '2026-10-16T10:00:00',
    },
    {
      orderId: 102,
      orderVersion: 1,
      orderType: 'CATALOG',
      status: 'ORDER_ACCEPTED',
      paymentStatus: 'UNPAID',
      paymentMethod: 'COD',
      finalPrice: 300000,
      customerName: 'Trần Thị B',
      createdAt: '2026-10-16T11:00:00',
    },
  ];

  const mockMyOrders: OrderListDTO[] = [
    {
      id: 201,
      customerName: 'Lê Văn C',
      finalPrice: 800000,
      status: 'DISCUSSING',
      startOrderTime: '2026-10-16T09:00:00',
      paymentMethod: 'ONLINE',
      orderType: 'CUSTOM',
      staffName: 'Staff Me',
      version: 1,
    },
    {
      id: 202,
      customerName: 'Hoàng Văn D',
      finalPrice: 1200000,
      status: 'ORDER_CREATING',
      startOrderTime: '2026-10-15T08:00:00',
      paymentMethod: 'ONLINE',
      orderType: 'CUSTOM',
      staffName: 'Staff Me',
      version: 2,
    },
    {
      id: 203,
      customerName: 'Vũ Thị E',
      finalPrice: 450000,
      status: 'DELIVERED',
      startOrderTime: '2026-10-10T08:00:00',
      paymentMethod: 'COD',
      orderType: 'CATALOG',
      staffName: 'Staff Me',
      version: 3,
    },
    {
      id: 204,
      customerName: 'Phạm Thị F',
      finalPrice: 200000,
      status: 'CANCELLED',
      startOrderTime: '2026-10-11T08:00:00',
      paymentMethod: 'COD',
      orderType: 'CATALOG',
      staffName: 'Staff Me',
      version: 2,
    },
  ];

  const mockDetailOrder: Order = {
    id: 201,
    version: 1,
    orderType: 'CUSTOM',
    totalPrice: 800000,
    finalPrice: 800000,
    status: 'DISCUSSING',
    startOrderTime: '2026-10-16T09:00:00',
    cancelReason: null,
    note: null,
    items: [],
  };

  beforeEach(async () => {
    orderService = jasmine.createSpyObj<OrderService>('OrderService', [
      'getClaimableOrders',
      'getMyStaffOrders',
      'getById',
      'claimOrder',
      'startProduction',
      'generateIdempotencyKey',
      'getOrderChatThread',
      'getOrderChatMessages',
      'sendOrderChatMessage',
      'getOrderAgreement',
      'shippingHandover',
    ]);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['notify', 'fromError']);
    actionDialogService = jasmine.createSpyObj<ActionDialogService>('ActionDialogService', ['confirm']);

    const claimablePage = {
      content: mockClaimableOrders,
      number: 0,
      size: 20,
      totalElements: 2,
      totalPages: 1,
      first: true,
      last: true,
      pageable: {},
      numberOfElements: 2,
      empty: false,
    } as PageResponse<OrderAssignmentQueueItem>;

    const myOrdersPage = {
      content: mockMyOrders,
      number: 0,
      size: 20,
      totalElements: 4,
      totalPages: 1,
      first: true,
      last: true,
      pageable: {},
      numberOfElements: 4,
      empty: false,
    } as PageResponse<OrderListDTO>;

    orderService.getClaimableOrders.and.returnValue(of(claimablePage));
    orderService.getMyStaffOrders.and.returnValue(of(myOrdersPage));
    orderService.getById.and.returnValue(of(mockDetailOrder));
    orderService.getOrderChatThread.and.returnValue(of({
      id: 1,
      orderId: 201,
      ownerUserId: 'user-001',
      assignedStaffId: 'staff-001',
      createdAt: '2026-10-16T09:00:00',
    }));
    orderService.getOrderChatMessages.and.returnValue(of([]));
    orderService.getOrderAgreement.and.returnValue(of({
      id: 1,
      orderId: 201,
      orderVersion: 1,
      orderType: 'CUSTOM',
      status: 'PENDING_STAFF_CONFIRMATION',
      quantity: 1,
      unitPrice: 800000,
      totalPrice: 800000,
      depositAmount: 400000,
      agreementVersion: 1,
      createdAt: '2026-10-16T09:00:00',
      deadline: '2026-10-17T09:00:00',
    } as any));

    await TestBed.configureTestingModule({
      imports: [StaffOrdersComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OrderService, useValue: orderService },
        { provide: ToastService, useValue: toastService },
        { provide: ActionDialogService, useValue: actionDialogService },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffOrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize with in_progress active tab and load orders', () => {
    expect(component.activeTab).toBe('in_progress');
    expect(orderService.getClaimableOrders).toHaveBeenCalled();
    expect(orderService.getMyStaffOrders).toHaveBeenCalled();
    expect(component.myOrders.length).toBe(4);
    expect(component.claimableOrders.length).toBe(2);
  });

  it('should correctly filter in_progress and completed orders', () => {
    // 2 active (DISCUSSING, ORDER_CREATING) and 2 finished (DELIVERED, CANCELLED)
    expect(component.inProgressOrders.length).toBe(2);
    expect(component.completedOrders.length).toBe(2);
    expect(component.totalInProgressCount).toBe(2);
    expect(component.totalCompletedCount).toBe(2);

    // Apply status filter on in_progress
    component.inProgressStatusFilter = 'DISCUSSING';
    expect(component.inProgressOrders.length).toBe(1);
    expect(component.inProgressOrders[0].id).toBe(201);

    // Apply status filter on completed (DELIVERED)
    component.completedStatusFilter = 'DELIVERED';
    expect(component.completedOrders.length).toBe(1);
    expect(component.completedOrders[0].id).toBe(203);

    // Apply status filter on completed (CANCELLED)
    component.completedStatusFilter = 'CANCELLED';
    expect(component.completedOrders.length).toBe(1);
    expect(component.completedOrders[0].id).toBe(204);
  });

  it('should filter claimable orders by type', () => {
    expect(component.filteredClaimableOrders.length).toBe(2);

    component.claimableFilter = 'CUSTOM';
    expect(component.filteredClaimableOrders.length).toBe(1);
    expect(component.filteredClaimableOrders[0].orderId).toBe(101);

    component.claimableFilter = 'CATALOG';
    expect(component.filteredClaimableOrders.length).toBe(1);
    expect(component.filteredClaimableOrders[0].orderId).toBe(102);
  });

  it('should open and close the large chat modal', () => {
    expect(component.showChatModal).toBeFalse();

    component.openOrderChat(mockMyOrders[0]);
    expect(component.showChatModal).toBeTrue();
    expect(orderService.getById).toHaveBeenCalledWith(201);
    expect(component.chatOrder?.id).toBe(201);

    component.closeOrderChat();
    expect(component.showChatModal).toBeFalse();
    expect(component.chatOrder).toBeNull();
  });

  it('should claim order and switch activeTab to in_progress', () => {
    actionDialogService.confirm.and.returnValue(of(true));
    orderService.claimOrder.and.returnValue(of({
      orderId: 101,
      orderStatus: 'DISCUSSING',
      orderVersion: 2,
    } as any));

    component.claimOrder(mockClaimableOrders[0]);

    expect(orderService.claimOrder).toHaveBeenCalledWith(101, 1);
    expect(toastService.notify).toHaveBeenCalledWith('Đã nhận đơn #101 – trạng thái DISCUSSING.');
    expect(component.activeTab).toBe('in_progress');
  });

  it('should start production with only the order ID and idempotency key', () => {
    const order: Order = {
      ...mockDetailOrder,
      id: 206,
      version: 5,
      status: 'ORDER_ACCEPTED',
      paymentMethod: 'COD',
    };
    component.selectedOrder = order;
    component.startingOrder = order;
    component.showStartProductionModal = true;
    orderService.generateIdempotencyKey.and.returnValue('idemp-start-production-206');
    orderService.startProduction.and.returnValue(of({
      orderId: 206,
      orderVersion: 6,
      status: 'ORDER_CREATING',
      productionStartedAt: '2026-10-24T09:00:00Z',
      itemDeadlines: [],
    }));

    component.confirmStartProduction();

    expect(orderService.startProduction).toHaveBeenCalledOnceWith(206, 'idemp-start-production-206');
    expect(component.selectedOrder?.status).toBe('ORDER_CREATING');
    expect(component.selectedOrder?.version).toBe(6);
    expect(component.showStartProductionModal).toBeFalse();
  });

  it('should check canShowCollaboration correctly', () => {
    const nonGuestOrder: Order = {
      ...mockDetailOrder,
      userId: 12,
      status: 'DISCUSSING',
    };
    component.activeTab = 'in_progress';
    expect(component.canShowCollaboration(nonGuestOrder)).toBeTrue();

    // In claimable tab, should be false
    component.activeTab = 'claimable';
    expect(component.canShowCollaboration(nonGuestOrder)).toBeFalse();
  });

  it('should check canHandoverShipping correctly', () => {
    expect(component.canHandoverShipping(null)).toBeFalse();
    expect(component.canHandoverShipping({ ...mockDetailOrder, status: 'ORDER_ACCEPTED' })).toBeFalse();
    expect(component.canHandoverShipping({ ...mockDetailOrder, status: 'READY_TO_SHIP' })).toBeTrue();
  });

  it('should only load change requests while specification changes are still allowed', () => {
    component.activeTab = 'in_progress';
    expect(component.canShowChangeRequests({ ...mockDetailOrder, status: 'ORDER_ACCEPTED' })).toBeTrue();
    expect(component.canShowChangeRequests({ ...mockDetailOrder, status: 'ORDER_CREATING' })).toBeTrue();
    expect(component.canShowChangeRequests({ ...mockDetailOrder, status: 'READY_TO_SHIP' })).toBeFalse();
    expect(component.canShowChangeRequests({ ...mockDetailOrder, status: 'SHIPPING' })).toBeFalse();

    component.activeTab = 'claimable';
    expect(component.canShowChangeRequests({ ...mockDetailOrder, status: 'ORDER_ACCEPTED' })).toBeFalse();
  });

  it('should open dialog and confirm shipping handover successfully', () => {
    const readyOrder: Order = {
      ...mockDetailOrder,
      id: 205,
      version: 4,
      status: 'READY_TO_SHIP',
      items: [
        {
          id: 901,
          orderItemId: 901,
          productId: 10,
          productName: 'Bình hoa men hỏa biến',
          quantity: 2,
          price: 400000,
        },
      ],
    };

    component.selectedOrder = readyOrder;
    component.openShippingHandoverDialog(readyOrder);

    expect(component.showHandoverModal).toBeTrue();
    expect(component.handoverOrder?.id).toBe(205);
    expect(component.handoverQuantities[901]).toBe(2);

    orderService.generateIdempotencyKey.and.returnValue('idemp-handover-test-205');
    orderService.shippingHandover.and.returnValue(of({
      orderId: 205,
      orderVersion: 5,
      status: 'SHIPPING',
      shippingStartedAt: '2026-10-16T14:00:00',
      expectedShippingDays: 2,
      expectedDeliveryAt: '2026-10-18T14:00:00',
      items: [{ orderItemId: 901, orderedQuantity: 2, exportedQuantity: 2 }],
    }));

    component.confirmShippingHandover();

    expect(orderService.shippingHandover).toHaveBeenCalledWith(
      205,
      {
        orderVersion: 4,
        items: [{ orderItemId: 901, exportedQuantity: 2 }],
        handoverNote: undefined,
      },
      'idemp-handover-test-205'
    );
    expect(component.showHandoverModal).toBeFalse();
    expect(toastService.notify).toHaveBeenCalled();
  });
});
