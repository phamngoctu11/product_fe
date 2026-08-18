import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { VoucherService } from './voucher.service';

describe('VoucherService', () => {
  let service: VoucherService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(VoucherService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads guest vouchers with subtotal', () => {
    service.getGuestVouchers(150000).subscribe((options) => {
      expect(options.length).toBe(1);
      expect(options[0].source).toBe('GUEST');
      expect(options[0].template.guestVoucher).toBeTrue();
    });

    const req = httpMock.expectOne((request) =>
      request.url === `${environment.apiUrl}/vouchers/guest`
      && request.params.get('subtotal') === '150000'
    );

    expect(req.request.method).toBe('GET');
    req.flush({
      success: true,
      status: 200,
      message: 'OK',
      data: [
        {
          userVoucherId: null,
          templateId: 7,
          source: 'GUEST',
          template: {
            id: 7,
            code: 'WELCOME10',
            name: 'Guest welcome',
            description: '',
            pointCost: 0,
            minOrderValue: 100000,
            discountPercent: 10,
            maxDiscountAmount: 30000,
            quantity: 5,
            active: true,
            guestVoucher: true,
            expiryDate: '2026-12-31T23:59:00',
          },
          applicable: true,
          best: true,
          discountAmount: 15000,
          finalPrice: 135000,
          unavailableReason: null,
        },
      ],
    });
  });

  it('loads management templates from admin endpoint', () => {
    service.getManagementTemplates().subscribe((templates) => {
      expect(templates.length).toBe(2);
      expect(templates[1].guestVoucher).toBeTrue();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/vouchers/admin/templates`);

    expect(req.request.method).toBe('GET');
    req.flush({
      success: true,
      status: 200,
      message: 'OK',
      data: [
        {
          id: 1,
          code: 'USER10',
          name: 'User voucher',
          description: '',
          pointCost: 20,
          minOrderValue: 100000,
          discountPercent: 10,
          maxDiscountAmount: 30000,
          quantity: 5,
          active: true,
          guestVoucher: false,
          expiryDate: '2026-12-31T23:59:00',
        },
        {
          id: 7,
          code: 'WELCOME10',
          name: 'Guest welcome',
          description: '',
          pointCost: 0,
          minOrderValue: 100000,
          discountPercent: 10,
          maxDiscountAmount: 30000,
          quantity: 5,
          active: true,
          guestVoucher: true,
          expiryDate: '2026-12-31T23:59:00',
        },
      ],
    });
  });
});
