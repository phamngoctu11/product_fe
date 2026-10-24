import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, Subject, throwError } from 'rxjs';
import { Order, OrderChatMessage, OrderChatThread } from '../../../model/order.model';
import { AuthService } from '../../../service/auth.service';
import { OrderService } from '../../../service/order.service';
import { ToastService } from '../../../service/toast.service';
import { WebsocketService } from '../../../service/websocket.service';
import { OrderCollaborationComponent } from './order-collaboration.component';

describe('OrderCollaborationComponent', () => {
  let fixture: ComponentFixture<OrderCollaborationComponent>;
  let component: OrderCollaborationComponent;
  let orderService: jasmine.SpyObj<OrderService>;
  let websocketService: jasmine.SpyObj<WebsocketService>;
  let authService: jasmine.SpyObj<AuthService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let isConnectedSubject: Subject<boolean>;
  let chatWsCallback: ((msg: OrderChatMessage) => void) | null = null;

  const mockOrder: Order = {
    id: 101,
    version: 2,
    userId: 'user-001',
    status: 'ORDER_ACCEPTED',
    totalPrice: 500000,
    finalPrice: 500000,
    startOrderTime: '2026-10-15T09:00:00',
    cancelReason: null,
    note: 'Đơn hàng thử nghiệm',
  };

  const mockThread: OrderChatThread = {
    id: 1,
    orderId: 101,
    ownerUserId: 'user-001',
    assignedStaffId: 'staff-999',
    createdAt: '2026-10-15T09:00:00',
  };

  const mockMessages: OrderChatMessage[] = [
    {
      id: '1',
      orderId: 101,
      chatThreadId: 1,
      senderId: 'user-001',
      senderRole: 'USER',
      senderName: 'Khách hàng A',
      content: 'Chào shop!',
      timestamp: '2026-10-15T09:05:00',
      messageType: 'TEXT',
    },
  ];

  beforeEach(async () => {
    isConnectedSubject = new Subject<boolean>();
    chatWsCallback = null;

    orderService = jasmine.createSpyObj<OrderService>('OrderService', [
      'getOrderAgreement',
      'getOrderChatThread',
      'getOrderChatMessages',
      'sendOrderChatMessage',
      'submitOrderAgreement',
      'generateIdempotencyKey',
    ]);
    websocketService = jasmine.createSpyObj<WebsocketService>('WebsocketService', [
      'isOrderChatConnected',
      'subscribeToOrderChat',
      'sendOrderChat',
      'connect',
    ]);
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getUserId',
      'isLoggedIn',
      'isStaff',
      'isCustomer',
    ]);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['notify', 'fromError']);

    (websocketService as any).isConnected$ = isConnectedSubject.asObservable();
    websocketService.isOrderChatConnected.and.returnValue(true);
    websocketService.subscribeToOrderChat.and.callFake((orderId, cb) => {
      chatWsCallback = cb;
      return () => {
        chatWsCallback = null;
      };
    });

    orderService.getOrderAgreement.and.returnValue(of({} as any));
    orderService.getOrderChatThread.and.returnValue(of(mockThread));
    orderService.getOrderChatMessages.and.returnValue(of(mockMessages));
    orderService.submitOrderAgreement.and.returnValue(of({ id: 1, agreementVersion: 1 } as any));
    orderService.generateIdempotencyKey.and.returnValue('mock-idempotency-key');
    authService.getUserId.and.returnValue('staff-999');

    await TestBed.configureTestingModule({
      imports: [OrderCollaborationComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OrderService, useValue: orderService },
        { provide: WebsocketService, useValue: websocketService },
        { provide: AuthService, useValue: authService },
        { provide: ToastService, useValue: toastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderCollaborationComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should stop the confirmation countdown from OrderAgreement.submittedAt', () => {
    component.order = {
      ...mockOrder,
      confirmationDueAt: '2026-10-25T09:00:00Z',
    };
    component.agreement = {
      id: 1,
      orderId: 101,
      orderVersion: 2,
      orderType: 'CUSTOM',
      orderStatus: 'DISCUSSING',
      agreementVersion: 1,
      agreementStatus: 'USER_SUBMITTED',
      itemSnapshot: null,
      subtotal: null,
      discountAmount: null,
      finalPrice: null,
      submittedAt: '2026-10-24T08:30:00Z',
    };

    (component as any).updateTimer();

    expect(component.timerStopped).toBeTrue();
    expect(component.timerStoppedText).toBe('Đã nộp đề xuất thỏa thuận');
    expect(component.countdownDisplay).toBe('');
  });

  it('should initialize chat and subscribe to websocket for staff order', () => {
    component.order = mockOrder;
    component.mode = 'STAFF';
    fixture.detectChanges();

    expect(orderService.getOrderChatThread).toHaveBeenCalledWith(101);
    expect(orderService.getOrderChatMessages).toHaveBeenCalledWith(101);
    expect(websocketService.subscribeToOrderChat).toHaveBeenCalled();
    expect(component.messages.length).toBe(1);
    expect(component.messages[0].content).toBe('Chào shop!');
  });

  it('should support onlyChat mode by defaulting to chat tab and skipping agreement fetch', () => {
    component.order = mockOrder;
    component.mode = 'STAFF';
    component.onlyChat = true;
    fixture.detectChanges();

    expect(component.activeTab).toBe('chat');
    expect(orderService.getOrderAgreement).not.toHaveBeenCalled();
    expect(orderService.getOrderChatThread).toHaveBeenCalledWith(101);
  });

  it('should send message via websocket when connected', () => {
    component.order = mockOrder;
    component.mode = 'STAFF';
    fixture.detectChanges();

    websocketService.sendOrderChat.and.returnValue(true);
    component.chatInput = 'Nhân viên đã nhận đơn và chuẩn bị làm';
    component.sendMessage();

    expect(websocketService.sendOrderChat).toHaveBeenCalledWith(101, 'Nhân viên đã nhận đơn và chuẩn bị làm');
    expect(component.chatInput).toBe('');
    expect(orderService.sendOrderChatMessage).not.toHaveBeenCalled();
  });

  it('should fallback to REST API when websocket publish fails', () => {
    component.order = mockOrder;
    component.mode = 'STAFF';
    fixture.detectChanges();

    websocketService.sendOrderChat.and.returnValue(false);
    const createdMsg: OrderChatMessage = {
      id: '2',
      orderId: 101,
      chatThreadId: 1,
      senderId: 'staff-999',
      senderRole: 'STAFF',
      senderName: 'Nhân viên',
      content: 'Tin nhắn gửi qua REST',
      timestamp: '2026-10-15T09:10:00',
      messageType: 'TEXT',
    };
    orderService.sendOrderChatMessage.and.returnValue(of(createdMsg));

    component.chatInput = 'Tin nhắn gửi qua REST';
    component.sendMessage();

    expect(websocketService.sendOrderChat).toHaveBeenCalledWith(101, 'Tin nhắn gửi qua REST');
    expect(orderService.sendOrderChatMessage).toHaveBeenCalledWith(101, 'Tin nhắn gửi qua REST');
    expect(component.messages.some((m) => m.id === '2')).toBeTrue();
  });

  it('should append received websocket message to list without duplicates', () => {
    component.order = mockOrder;
    component.mode = 'STAFF';
    fixture.detectChanges();

    expect(chatWsCallback).toBeTruthy();

    const incomingMsg: OrderChatMessage = {
      id: '3',
      orderId: 101,
      chatThreadId: 1,
      senderId: 'user-001',
      senderRole: 'USER',
      senderName: 'Khách hàng',
      content: 'Sản phẩm giao sớm được không?',
      timestamp: '2026-10-15T09:15:00',
      messageType: 'TEXT',
    };

    chatWsCallback!(incomingMsg);
    expect(component.messages.length).toBe(2);
    expect(component.messages[1].content).toBe('Sản phẩm giao sớm được không?');

    // Duplicate message should not be appended again
    chatWsCallback!(incomingMsg);
    expect(component.messages.length).toBe(2);
  });

  it('should reflect websocket connection state changes via isWsConnected', () => {
    component.order = mockOrder;
    component.mode = 'STAFF';
    fixture.detectChanges();

    expect(component.isWsConnected).toBeTrue();

    isConnectedSubject.next(false);
    expect(component.wsConnected).toBeFalse();

    isConnectedSubject.next(true);
    expect(component.wsConnected).toBeTrue();
  });

  it('should retry fetching chat thread when retryInitChat is called after error', () => {
    orderService.getOrderChatThread.and.returnValue(throwError(() => ({ status: 500, error: { message: 'Lỗi máy chủ' } })));
    component.order = mockOrder;
    component.mode = 'STAFF';
    fixture.detectChanges();

    expect(component.chatError).toBeTruthy();

    // Now recover and retry
    orderService.getOrderChatThread.and.returnValue(of(mockThread));
    component.retryInitChat();

    expect(orderService.getOrderChatThread).toHaveBeenCalledTimes(2);
  });

  describe('isGuestOrder', () => {
    it('should be false for CUSTOM orders even if userId is omitted', () => {
      component.order = {
        ...mockOrder,
        orderType: 'CUSTOM',
        userId: undefined,
        user_id: undefined,
      };
      expect(component.isGuestOrder).toBeFalse();
    });

    it('should be false when order has user_id or customer.userId', () => {
      component.order = {
        ...mockOrder,
        orderType: 'CATALOG',
        userId: undefined,
        user_id: 'user-456',
      };
      expect(component.isGuestOrder).toBeFalse();

      component.order = {
        ...mockOrder,
        orderType: 'CATALOG',
        userId: undefined,
        user_id: undefined,
        customer: { guest: false, userId: 'user-789' } as any,
      };
      expect(component.isGuestOrder).toBeFalse();
    });

    it('should be true when guestSessionId is present or customer is guest', () => {
      component.order = {
        ...mockOrder,
        orderType: 'CATALOG',
        userId: 'user-001',
        guestSessionId: 'guest-session-uuid',
      };
      expect(component.isGuestOrder).toBeTrue();

      component.order = {
        ...mockOrder,
        orderType: 'CATALOG',
        userId: undefined,
        customer: { guest: true } as any,
      };
      expect(component.isGuestOrder).toBeTrue();
    });
  });

  describe('isOwnMessage', () => {
    it('should distinguish messages by role in USER mode', () => {
      component.mode = 'USER';
      const userMsg: OrderChatMessage = {
        id: '1',
        orderId: 101,
        chatThreadId: 1,
        senderId: 'user-001',
        senderRole: 'USER',
        senderName: 'Khách',
        content: 'test',
        timestamp: '',
      };
      const staffMsg: OrderChatMessage = {
        id: '2',
        orderId: 101,
        chatThreadId: 1,
        senderId: 'staff-999',
        senderRole: 'STAFF',
        senderName: 'Nhân viên',
        content: 'test',
        timestamp: '',
      };
      expect(component.isOwnMessage(userMsg)).toBeTrue();
      expect(component.isOwnMessage(staffMsg)).toBeFalse();
    });

    it('should distinguish messages by role in STAFF mode', () => {
      component.mode = 'STAFF';
      const userMsg: OrderChatMessage = {
        id: '1',
        orderId: 101,
        chatThreadId: 1,
        senderId: 'user-001',
        senderRole: 'USER',
        senderName: 'Khách',
        content: 'test',
        timestamp: '',
      };
      const staffMsg: OrderChatMessage = {
        id: '2',
        orderId: 101,
        chatThreadId: 1,
        senderId: 'staff-999',
        senderRole: 'STAFF',
        senderName: 'Nhân viên',
        content: 'test',
        timestamp: '',
      };
      expect(component.isOwnMessage(userMsg)).toBeFalse();
      expect(component.isOwnMessage(staffMsg)).toBeTrue();
    });
  });

  describe('submitUserAgreement', () => {
    it('should include paymentMethod for CUSTOM order agreement submission', () => {
      component.order = {
        ...mockOrder,
        orderType: 'CUSTOM',
        version: 3,
      };
      component.mode = 'USER';
      component.customDescription = 'Tượng gốm thủ công theo mẫu';
      component.customQuantity = 2;
      component.customUnitPrice = 150000;
      component.customDurationDays = 5;
      component.customPaymentMethod = 'ONLINE';

      component.submitUserAgreement();

      expect(orderService.submitOrderAgreement).toHaveBeenCalledWith(
        101,
        jasmine.objectContaining({
          orderVersion: 3,
          description: 'Tượng gốm thủ công theo mẫu',
          quantity: 2,
          unitPrice: 150000,
          productionDurationDays: 5,
          paymentMethod: 'ONLINE',
        }),
        'mock-idempotency-key'
      );
    });

    it('should not send custom fields and omit paymentMethod for CATALOG order agreement', () => {
      component.order = {
        ...mockOrder,
        orderType: 'CATALOG',
        version: 1,
      };
      component.mode = 'USER';
      component.customDescription = 'ignored';
      component.customPaymentMethod = 'ONLINE';

      component.submitUserAgreement();

      expect(orderService.submitOrderAgreement).toHaveBeenCalledWith(
        101,
        jasmine.objectContaining({
          orderVersion: 1,
          description: undefined,
          quantity: undefined,
          unitPrice: undefined,
          productionDurationDays: undefined,
          paymentMethod: undefined,
        }),
        'mock-idempotency-key'
      );
    });
  });
});
