import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GuestSessionService {
  private readonly storageKey = 'guestSessionId';

  getOrCreateSessionId(): string {
    const existing = this.readSessionId();
    if (existing) return existing;

    const sessionId = this.generateSessionId();
    this.writeSessionId(sessionId);
    return sessionId;
  }

  clearSessionId(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // Ignore storage errors; a new session will be generated when needed.
    }
  }

  private readSessionId(): string | null {
    try {
      const value = localStorage.getItem(this.storageKey)?.trim();
      return value && this.isValidSessionId(value) ? value : null;
    } catch {
      return null;
    }
  }

  private writeSessionId(sessionId: string): void {
    try {
      localStorage.setItem(this.storageKey, sessionId);
    } catch {
      // Keep the generated value for the current call even if storage is unavailable.
    }
  }

  private generateSessionId(): string {
    const randomId = globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    return `guest-${randomId}`;
  }

  private isValidSessionId(sessionId: string): boolean {
    return /^[A-Za-z0-9._:-]{16,128}$/.test(sessionId);
  }
}
