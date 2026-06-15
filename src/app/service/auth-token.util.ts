export const AUTH_STORAGE_KEYS = ['accessToken', 'user_id', 'username'] as const;

export const APPLICATION_ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'USER'] as const;
export type ApplicationRole = (typeof APPLICATION_ROLES)[number];

export interface KeycloakJwtPayload {
  exp?: number;
  preferred_username?: string;
  role?: string | string[];
  realm_access?: {
    roles?: string[];
  };
  [claim: string]: unknown;
}

export function decodeJwtPayload(token: string | null): KeycloakJwtPayload | null {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json = decodeURIComponent(
      Array.from(atob(paddedBase64))
        .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );

    return JSON.parse(json) as KeycloakJwtPayload;
  } catch {
    return null;
  }
}

export function getApplicationRoles(payload: KeycloakJwtPayload | null): ApplicationRole[] {
  if (!payload) return [];

  const legacyRoles = Array.isArray(payload.role) ? payload.role : payload.role ? [payload.role] : [];
  const realmRoles = payload.realm_access?.roles ?? [];
  const roles = new Set([...realmRoles, ...legacyRoles].map((role) => role.toUpperCase()));

  return APPLICATION_ROLES.filter((role) => roles.has(role));
}

export function isJwtExpired(payload: KeycloakJwtPayload | null, now = Date.now()): boolean {
  return !payload?.exp || payload.exp <= Math.floor(now / 1000);
}

export function clearAuthStorage(): void {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}
