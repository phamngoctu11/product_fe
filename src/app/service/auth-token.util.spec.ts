import {
  decodeJwtPayload,
  getApplicationRoles,
  isJwtExpired,
} from './auth-token.util';

function createToken(payload: object): string {
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${encodedPayload}.signature`;
}

describe('Keycloak token utilities', () => {
  it('reads application roles from realm_access', () => {
    const payload = decodeJwtPayload(createToken({
      realm_access: {
        roles: ['default-roles-my-workflow', 'MANAGER'],
      },
    }));

    expect(getApplicationRoles(payload)).toEqual(['MANAGER']);
  });

  it('keeps compatibility with the previous role claim', () => {
    const payload = decodeJwtPayload(createToken({ role: 'STAFF' }));

    expect(getApplicationRoles(payload)).toEqual(['STAFF']);
  });

  it('detects expired and malformed tokens', () => {
    expect(isJwtExpired(decodeJwtPayload(createToken({ exp: 100 })), 101_000)).toBeTrue();
    expect(isJwtExpired(decodeJwtPayload('not-a-jwt'))).toBeTrue();
  });
});
