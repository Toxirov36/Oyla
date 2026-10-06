// Formatting stays independent of browser ICU support; future locales use this interface.
export const locale = 'uz';
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
export function formatDate(value: string | Date, weekday = false) {
  const date = tashkentDate(value);
  return `${weekday ? `${days[date.getUTCDay()]}, ` : ''}${date.getUTCDate()}-${months[date.getUTCMonth()]}`;
}
