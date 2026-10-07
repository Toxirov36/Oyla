import { describe, expect, it } from 'vitest';
import {
  notificationDateGroup,
  notificationTime,
  notificationTimestamp,
  safeNotificationLink,
} from '../src/lib/notifications';
describe('notification labels and links', () => {
  it('groups dates at the Tashkent midnight boundary', () => {
    const now = Date.parse('2026-10-07T19:05:00Z');
    expect(notificationDateGroup('2026-10-07T19:01:00Z', now)).toBe('Bugun');
    expect(notificationDateGroup('2026-10-07T18:59:00Z', now)).toBe('Kecha');
    expect(notificationDateGroup('2026-10-05T18:59:00Z', now)).toBe('Avvalroq');
    expect(notificationTimestamp('2026-10-07T19:05:00Z')).toBe('8-oktabr 2026, 00:05');
  });
  it('shows meaningful relative times and accepts only internal navigation', () => {
    const now = Date.parse('2026-10-07T10:00:00Z');
    expect(notificationTime('2026-10-07T09:55:00Z', now)).toBe('5 daqiqa avval');
    expect(notificationTime('2026-10-07T08:00:00Z', now)).toBe('2 soat avval');
    expect(notificationTime('2026-10-07T10:01:00Z', now)).toBe('Hozirgina');
    expect(safeNotificationLink('/assignments')).toBe('/assignments');
    for (const link of [
      'https://example.uz',
      '//example.uz',
      '/\\example.uz',
      '/\nexample.uz',
      null,
    ])
      expect(safeNotificationLink(link)).toBeNull();
  });
});
