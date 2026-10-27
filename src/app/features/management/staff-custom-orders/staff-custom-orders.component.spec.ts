import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { Order, OrderListDTO } from '../../../model/order.model';
import { OrderService } from '../../../service/order.service';
import { ToastService } from '../../../service/toast.service';
import { WebsocketService } from '../../../service/websocket.service';
import { StaffCustomOrdersComponent } from './staff-custom-orders.component';

describe('StaffCustomOrdersComponent', () => {
  let fixture: ComponentFixture<StaffCustomOrdersComponent>;
  let component: StaffCustomOrdersComponent;
  let orderService: jasmine.SpyObj<OrderService>;
  let websocketService: jasmine.SpyObj<WebsocketService>;

  const mockStaffOrder: OrderListDTO = {
    id: 101,
    customerName: 'Khách hàng A',
    finalPrice: 600000,
    status: 'DISCUSSING',
    startOrderTime: '2026-10-15T09:00:00',
    paymentMethod: 'VNPAY',
    orderType: 'CUSTOM',
  };

  const mockDetail: Order = {
    id: 101,
    version: 1,
    userId: 'user-001',
    status: 'DISCUSSING',
    totalPrice: 600000,
    finalPrice: 600000,
    startOrderTime: '2026-10-15T09:00:00',
    cancelReason: null,
    note: 'Ghi chú đơn hàng',
    orderType: 'CUSTOM',
  };

  beforeEach(async () => {
    orderService = jasmine.createSpyObj<OrderService>('OrderService', [
      'getMyStaffOrders',
      'getById',
      'getOrderAgreement',
      'getOrderChatThread',
      'getOrderChatMessages',
    ]);
    websocketService = jasmine.createSpyObj<WebsocketService>('WebsocketService', [
      'isOrderChatConnected',
      'subscribeToOrderChat',
      'sendOrderChat',
      'disconnect',
    ]);
    (websocketService as any).isConnected$ = of(true);

    orderService.getMyStaffOrders.and.returnValue(of({
      content: [mockStaffOrder],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20,
    } as any));

    orderService.getById.and.returnValue(of(mockDetail));
    orderService.getOrderAgreement.and.returnValue(of({} as any));
    orderService.getOrderChatThread.and.returnValue(of({ id: 1, orderId: 101, ownerUserId: 'u1', assignedStaffId: 's1', createdAt: '' } as any));
    orderService.getOrderChatMessages.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [StaffCustomOrdersComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OrderService, useValue: orderService },
        { provide: WebsocketService, useValue: websocketService },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ orderId: '101' }),
          },
        },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj<ToastService>('ToastService', ['notify', 'fromError', 'warning']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffCustomOrdersComponent);
    component = fixture.componentInstance;
  });

  it('should create and load staff custom orders', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.statusFilter).toBe('DISCUSSING');
    expect(orderService.getMyStaffOrders).toHaveBeenCalled();
    expect(component.customOrders.length).toBe(1);
    expect(component.selectedOrderId).toBe(101);
  });

  it('should filter orders by status', () => {
    fixture.detectChanges();
    component.statusFilter = 'DISCUSSING';
    expect(component.filteredOrders.length).toBe(1);

    component.statusFilter = 'ORDER_ACCEPTED';
    expect(component.filteredOrders.length).toBe(0);

    component.statusFilter = 'DELIVERED';
    expect(component.filteredOrders.length).toBe(0);
  });
});
