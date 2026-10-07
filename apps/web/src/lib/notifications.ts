import type { NotificationType } from './types';
import { formatDate, tashkentDate } from './locale';

export const notificationTypes: { value: NotificationType; label: string }[] = [
  { value: 'FRIEND', label: 'Do‘stlar' },
  { value: 'ASSIGNMENT', label: 'Topshiriqlar' },
  { value: 'BADGE', label: 'Nishonlar' },
  { value: 'ACCOUNT', label: 'Hisob' },
  { value: 'SECURITY', label: 'Xavfsizlik' },
  { value: 'SYSTEM', label: 'Tizim' },
  { value: 'WARNING', label: 'Muhim' },
];
export function notificationTime(value: string, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - Date.parse(value)) / 1000));
  if (seconds < 60) return 'Hozirgina';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} daqiqa avval`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} soat avval`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)} kun avval`;
  return formatDate(value);
}
export function notificationTimestamp(value: string) {
  const date = tashkentDate(value);
  return `${formatDate(value)} ${date.getUTCFullYear()}, ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}
export function notificationDateGroup(value: string, now = Date.now()) {
  const day = tashkentDate(value).toISOString().slice(0, 10);
  if (day === tashkentDate(new Date(now)).toISOString().slice(0, 10)) return 'Bugun';
  if (
    day ===
    tashkentDate(new Date(now - 86400000))
      .toISOString()
      .slice(0, 10)
  )
    return 'Kecha';
  return 'Avvalroq';
}
export function safeNotificationLink(link: string | null) {
  return link?.startsWith('/') && !link.startsWith('//') && !/[\\\r\n]/.test(link) ? link : null;
}
