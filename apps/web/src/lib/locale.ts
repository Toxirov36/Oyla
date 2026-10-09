import { getLocale, localeTags, type Locale } from '../i18n';
const months = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];
const days = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
export function tashkentDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Date(date.getTime() + 5 * 3600000);
}
export function formatDate(value: string | Date, weekday = false, locale: Locale = getLocale()) {
  if (locale !== 'uz') {
    return new Intl.DateTimeFormat(localeTags[locale], {
      timeZone: 'Asia/Tashkent',
      day: 'numeric',
      month: 'long',
      ...(weekday ? { weekday: 'long' } : {}),
    }).format(typeof value === 'string' ? new Date(value) : value);
  }
  const date = tashkentDate(value);
  return `${weekday ? `${days[date.getUTCDay()]}, ` : ''}${date.getUTCDate()}-${months[date.getUTCMonth()]}`;
}
export function formatNumber(value: number, locale: Locale = getLocale()) {
  return new Intl.NumberFormat(localeTags[locale]).format(value);
}
