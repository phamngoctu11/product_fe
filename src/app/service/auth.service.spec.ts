import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

function createToken(payload: object): string {
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${encodedPayload}.signature`;
}

function createRoleToken(role: string): string {
  return createToken({
    exp: Math.floor(Date.now() / 1000) + 300,
    realm_access: { roles: [role] },
  });
}

describe('AuthService navigation', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('routes guests to the public product page', () => {
    expect(service.getHomeRoute()).toBe('/store/product');
  });

  it('routes customers to the storefront and backoffice roles to management', () => {
    localStorage.setItem('accessToken', createRoleToken('USER'));
    expect(service.getHomeRoute()).toBe('/store/product');

    localStorage.setItem('accessToken', createRoleToken('STAFF'));
    expect(service.getHomeRoute()).toBe('/management/product');
  });
});
