import { TestBed } from '@angular/core/testing';
import { GuestSessionService } from './guest-session.service';

describe('GuestSessionService', () => {
  let service: GuestSessionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(GuestSessionService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('creates and reuses a valid guest session id', () => {
    const firstSessionId = service.getOrCreateSessionId();
    const secondSessionId = service.getOrCreateSessionId();

    expect(firstSessionId).toMatch(/^guest-[A-Za-z0-9._:-]+$/);
    expect(firstSessionId.length).toBeGreaterThanOrEqual(16);
    expect(firstSessionId.length).toBeLessThanOrEqual(128);
    expect(secondSessionId).toBe(firstSessionId);
    expect(localStorage.getItem('guestSessionId')).toBe(firstSessionId);
  });

  it('ignores an invalid stored guest session id', () => {
    localStorage.setItem('guestSessionId', 'bad');

    const sessionId = service.getOrCreateSessionId();

    expect(sessionId).not.toBe('bad');
    expect(sessionId).toMatch(/^guest-[A-Za-z0-9._:-]+$/);
  });
});
