import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { CustomOrdersComponent } from './custom-orders.component';
import { OrderService } from '../../../service/order.service';
import { CustomRequestService } from '../../../service/custom-request.service';
import { ToastService } from '../../../service/toast.service';
import { Order, OrderListDTO } from '../../../model/order.model';
import { PageResponse } from '../../../model/page-response.model';

describe('CustomOrdersComponent', () => {
  let fixture: ComponentFixture<CustomOrdersComponent>;
  let component: CustomOrdersComponent;
  let orderService: jasmine.SpyObj<OrderService>;
  let customRequestService: jasmine.SpyObj<CustomRequestService>;
  let toastService: jasmine.SpyObj<ToastService>;

  const mockCustomOrders: OrderListDTO[] = [
    {
      id: 9,
      customerName: 'Phạm Tú',
      finalPrice: 1500000,
      status: 'DISCUSSING',
      startOrderTime: '2026-10-16T10:00:00',
      paymentMethod: 'ONLINE',
      orderType: 'CUSTOM',
      staffName: 'Nguyễn Thợ Gốm',
      version: 1,
    },
    {
      id: 12,
      customerName: 'Phạm Tú',
      finalPrice: 2000000,
      status: 'ORDER_ACCEPTED',
      startOrderTime: '2026-10-15T09:00:00',
      paymentMethod: 'ONLINE',
      orderType: 'CUSTOM',
      staffName: 'Trần Nghệ Nhân',
      version: 2,
    },
    {
      id: 15,
      customerName: 'Phạm Tú',
      finalPrice: 300000,
      status: 'ORDER_CREATING',
      startOrderTime: '2026-10-14T08:00:00',
      paymentMethod: 'COD',
      orderType: 'CATALOG', // should be excluded
      version: 1,
    },
  ];

  const mockFullOrder: Order = {
    id: 9,
    version: 1,
    orderType: 'CUSTOM',
    totalPrice: 1500000,
    finalPrice: 1500000,
    status: 'DISCUSSING',
    startOrderTime: '2026-10-16T10:00:00',
    cancelReason: null,
    note: null,
    items: [],
  };

  beforeEach(async () => {
    orderService = jasmine.createSpyObj<OrderService>('OrderService', [
      'getMyOrders',
      'getById',
      'getOrderChatThread',
      'getOrderChatMessages',
      'sendOrderChatMessage',
      'getOrderAgreement',
    ]);
    customRequestService = jasmine.createSpyObj<CustomRequestService>('CustomRequestService', ['list']);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['fromError', 'success', 'warning']);

    const pageResponse = {
      content: mockCustomOrders,
      number: 0,
      size: 100,
      totalElements: 3,
      totalPages: 1,
      first: true,
      last: true,
      pageable: {},
      numberOfElements: 3,
      empty: false,
    } as PageResponse<OrderListDTO>;

    orderService.getMyOrders.and.returnValue(of(pageResponse));
    customRequestService.list.and.returnValue(of({ content: [] } as any));
    orderService.getById.and.returnValue(of(mockFullOrder));
    orderService.getOrderChatThread.and.returnValue(of({
      id: 1,
      orderId: 9,
      ownerUserId: 'user-001',
      assignedStaffId: 'staff-001',
      createdAt: '2026-10-16T10:00:00',
    }));
    orderService.getOrderChatMessages.and.returnValue(of([]));
    orderService.getOrderAgreement.and.returnValue(of({
      id: 1,
      orderId: 9,
      orderVersion: 1,
      orderType: 'CUSTOM',
      orderStatus: 'DISCUSSING',
      agreementVersion: 1,
      agreementStatus: 'DRAFT',
      itemSnapshot: null,
      subtotal: 1500000,
      discountAmount: 0,
      finalPrice: 1500000,
    }));

    await TestBed.configureTestingModule({
      imports: [CustomOrdersComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OrderService, useValue: orderService },
        { provide: CustomRequestService, useValue: customRequestService },
        { provide: ToastService, useValue: toastService },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomOrdersComponent);
    component = fixture.componentInstance;
  });

  it('should load only custom orders on init', () => {
    fixture.detectChanges();
    expect(orderService.getMyOrders).toHaveBeenCalledWith(0, 100);
    // Out of 3 orders, only 2 are CUSTOM
    expect(component.customOrders.length).toBe(2);
    expect(component.customOrders.every((o) => o.orderType === 'CUSTOM')).toBeTrue();
  });

  it('should filter orders by status using statusFilter', () => {
    fixture.detectChanges();
    expect(component.filteredOrders.length).toBe(2);

    component.statusFilter = 'DISCUSSING';
    expect(component.filteredOrders.length).toBe(1);
    expect(component.filteredOrders[0].id).toBe(9);

    component.statusFilter = 'ORDER_ACCEPTED';
    expect(component.filteredOrders.length).toBe(1);
    expect(component.filteredOrders[0].id).toBe(12);

    component.statusFilter = 'DELIVERED';
    expect(component.filteredOrders.length).toBe(0);
  });

  it('should select order and load detail via getById', () => {
    fixture.detectChanges();
    component.selectOrder(mockCustomOrders[1]); // Order #12
    expect(orderService.getById).toHaveBeenCalledWith(12);
    expect(component.selectedOrderId).toBe(12);
  });

  it('should identify custom orders even when orderType is undefined in backend OrderListDTO', () => {
    // Simulate real backend DTO where orderType is absent
    const rawBackendOrders: OrderListDTO[] = [
      {
        id: 9,
        customerName: 'Phạm Tú',
        finalPrice: 0,
        status: 'DISCUSSING',
        startOrderTime: '2026-10-16T10:00:00',
        paymentMethod: 'ONLINE',
        staffName: 'Nguyễn Thợ Gốm',
      },
      {
        id: 20,
        customerName: 'Phạm Tú',
        finalPrice: 500000,
        status: 'ORDER_CREATING',
        startOrderTime: '2026-10-15T09:00:00',
        paymentMethod: 'ONLINE',
      },
      {
        id: 99,
        customerName: 'Phạm Tú',
        finalPrice: 200000,
        status: 'ORDER_CREATING',
        startOrderTime: '2026-10-14T08:00:00',
        paymentMethod: 'COD',
      },
    ];

    orderService.getMyOrders.and.returnValue(of({
      content: rawBackendOrders,
      number: 0,
      size: 100,
      totalElements: 3,
      totalPages: 1,
      first: true,
      last: true,
      pageable: {},
      numberOfElements: 3,
      empty: false,
    } as PageResponse<OrderListDTO>));

    // CustomRequest #5 has linkedOrderId = 20
    customRequestService.list.and.returnValue(of({
      content: [
        { id: 5, linkedOrderId: 20 } as any,
      ],
    } as any));

    component.loadOrders();

    // Order 9 is included because status is DISCUSSING
    // Order 20 is included because linkedOrderId is 20
    // Order 99 is excluded
    expect(component.customOrders.length).toBe(2);
    expect(component.customOrders.some((o) => o.id === 9)).toBeTrue();
    expect(component.customOrders.some((o) => o.id === 20)).toBeTrue();
    expect(component.customOrders.some((o) => o.id === 99)).toBeFalse();
  });
});
