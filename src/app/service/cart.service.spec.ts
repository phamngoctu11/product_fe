import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CartService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('sends X-Guest-Session-Id when reading cart without login', () => {
    service.getCartByUserId(null).subscribe((cart) => {
      expect(cart.items).toEqual([]);
      expect(cart.totalPrice).toBe(0);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/cart`);
    const guestSessionId = req.request.headers.get('X-Guest-Session-Id');

    expect(req.request.method).toBe('GET');
    expect(guestSessionId).toMatch(/^guest-[A-Za-z0-9._:-]+$/);
    expect(localStorage.getItem('guestSessionId')).toBe(guestSessionId);

    req.flush({
      success: true,
      status: 200,
      message: 'OK',
      data: { user_id: null, items: [], totalPrice: 0 },
    });
  });

  it('sends guest header and item params when adding to cart without login', () => {
    service.addToCart(null, 12, 3).subscribe((result) => {
      expect(result).toBeUndefined();
    });

    const req = httpMock.expectOne((request) =>
      request.url === `${environment.apiUrl}/cart/items`
      && request.params.get('variantId') === '12'
      && request.params.get('quantity') === '3'
    );

    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-Guest-Session-Id')).toMatch(/^guest-[A-Za-z0-9._:-]+$/);

    req.flush({
      success: true,
      status: 200,
      message: 'Added to cart',
      data: undefined,
    });
  });

  it('sends guest checkout payload with guest and idempotency headers', () => {
    service.guestCheckout({
      customerName: 'Nguyen Van A',
      phone: '0901234567',
      email: 'guest@example.com',
      shippingAddress: '123 Handmade Street',
      note: 'Goi hang can than',
      voucherCode: 'WELCOME10',
      variantIds: [12, 15],
    }, 'guest-checkout-key').subscribe((response) => {
      expect(response.orderId).toBe(99);
      expect(response.status).toBe('PENDING_APPROVAL');
      expect(response.lookupToken).toBe('guest-public-token');
      expect(response.maskedEmail).toBe('g***@example.com');
      expect(response.guestWorkflowStatus).toBe('STARTED');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/guest-checkout`);

    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-Guest-Session-Id')).toMatch(/^guest-[A-Za-z0-9._:-]+$/);
    expect(req.request.headers.get('Idempotency-Key')).toBe('guest-checkout-key');
    expect(req.request.body.variantIds).toEqual([12, 15]);
    expect(req.request.body.email).toBe('guest@example.com');
    expect(req.request.body.voucherCode).toBe('WELCOME10');

    req.flush({
      success: true,
      status: 200,
      message: 'OK',
      data: {
        orderId: 99,
        status: 'PENDING_APPROVAL',
        totalPrice: 300000,
        finalPrice: 300000,
        paymentMethod: 'COD',
        lookupToken: 'guest-public-token',
        maskedEmail: 'g***@example.com',
        guestWorkflowStatus: 'STARTED',
        message: 'OK',
      },
    });
  });

  it('posts registered-user checkout to the current checkout contract', () => {
    service.checkout({
      variantIds: [12, 15],
      userVoucherId: 7,
      paymentMethod: 'COD',
      note: 'Gói hàng cẩn thận',
    }, 'user-checkout-key').subscribe((response) => {
      expect(response.orderId).toBe(100);
      expect(response.status).toBe('PENDING_APPROVAL');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/checkout`);

    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('user-checkout-key');
    expect(req.request.headers.has('X-Guest-Session-Id')).toBeFalse();
    expect(req.request.body).toEqual({
      variantIds: [12, 15],
      userVoucherId: 7,
      paymentMethod: 'COD',
      note: 'Gói hàng cẩn thận',
    });

    req.flush({
      success: true,
      status: 200,
      message: 'OK',
      data: {
        orderId: 100,
        status: 'PENDING_APPROVAL',
        paymentMethod: 'COD',
        message: 'Đơn hàng đã được tạo và đang chờ quản lý duyệt.',
      },
    });
  });
});
