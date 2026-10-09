import { translate as tx } from '../i18n';
import type { NotificationType } from './types';
import { formatDate, tashkentDate } from './locale';
import { getLocale, localeTags, translate, localizeText } from '../i18n';

export const notificationTypes: { value: NotificationType; label: string }[] = [
  {
    value: 'FRIEND',
    get label() {
      return tx('pages.student-data.friends');
    },
  },
  {
    value: 'ASSIGNMENT',
    get label() {
      return tx('navigation.assignments');
    },
  },
  {
    value: 'BADGE',
    get label() {
      return tx('navigation.badges');
    },
  },
  {
    value: 'ACCOUNT',
    get label() {
      return tx('pages.notifications.account');
    },
  },
  {
    value: 'SECURITY',
    get label() {
      return tx('pages.notifications.security');
    },
  },
  {
    value: 'SYSTEM',
    get label() {
      return tx('pages.notifications.system');
    },
  },
  {
    value: 'WARNING',
    get label() {
      return tx('pages.notifications.important');
    },
  },
];
export function notificationTime(value: string, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - Date.parse(value)) / 1000));
  if (getLocale() !== 'uz') {
    if (seconds < 60) return translate('notifications.justNow');
    const [amount, unit] =
      seconds < 3600
        ? ([Math.floor(seconds / 60), 'minute'] as const)
        : seconds < 86400
          ? ([Math.floor(seconds / 3600), 'hour'] as const)
          : ([Math.floor(seconds / 86400), 'day'] as const);
    if (seconds < 7 * 86400)
      return new Intl.RelativeTimeFormat(localeTags[getLocale()], { numeric: 'always' }).format(
        -amount,
        unit,
      );
    return formatDate(value);
  }
  if (seconds < 60) return tx('notifications.justNow');
  if (seconds < 3600)
    return tx('pages.notifications.minutesAgo', { value1: Math.floor(seconds / 60) });
  if (seconds < 86400)
    return tx('pages.notifications.hoursAgo', { value1: Math.floor(seconds / 3600) });
  if (seconds < 7 * 86400)
    return tx('pages.notifications.daysAgo', { value1: Math.floor(seconds / 86400) });
  return formatDate(value);
}
export function notificationTimestamp(value: string) {
  const date = tashkentDate(value);
  return `${formatDate(value)} ${date.getUTCFullYear()}, ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}
export function notificationDateGroup(value: string, now = Date.now()) {
  const day = tashkentDate(value).toISOString().slice(0, 10);
  if (day === tashkentDate(new Date(now)).toISOString().slice(0, 10))
    return tx('pages.notifications.today');
  if (
    day ===
    tashkentDate(new Date(now - 86400000))
      .toISOString()
      .slice(0, 10)
  )
    return tx('pages.notifications.yesterday');
  return tx('pages.notifications.earlier');
}
export function safeNotificationLink(link: string | null) {
  return link?.startsWith('/') && !link.startsWith('//') && !/[\\\r\n]/.test(link) ? link : null;
}

/** Read legacy stored events in the selected language without rewriting their data. */
export function notificationBody(title: string, body: string) {
  const patterns: Record<string, { pattern: RegExp; key: string; fields: string[] }> = {
    'Brain Ring taklifi': {
      pattern: /^(.*) sizni bilim bellashuviga taklif qildi\.$/s,
      key: 'brainInviteBody',
      fields: ['name'],
    },
    'Brain Ring boshlandi': {
      pattern: /^(.*) taklifingizni qabul qildi\.$/s,
      key: 'brainStartedBody',
      fields: ['name'],
    },
    'Yangi do‘stlik so‘rovi': {
      pattern: /^(.*) sizni do‘stlikka taklif qildi\.$/s,
      key: 'friendInviteBody',
      fields: ['name'],
    },
    'Do‘stlik so‘rovi qabul qilindi': {
      pattern: /^(.*) so‘rovingizni qabul qildi\.$/s,
      key: 'friendAcceptedBody',
      fields: ['name'],
    },
    'Parolni tiklash so‘rovi': {
      pattern:
        /^(.*) \((.*)\) parolini tiklashni so‘radi\. Havola berishdan oldin uning kimligini tekshiring\.$/s,
      key: 'recoveryBody',
      fields: ['name', 'email'],
    },
    'Hisobingiz roli yangilandi': {
      pattern: /^Yangi rol: (.*)\. Yangi huquqlar bilan tizimga qayta kiring\.$/s,
      key: 'roleBody',
      fields: ['role'],
    },
  };
  const entry = patterns[title];
  const match = entry?.pattern.exec(body);
  if (entry && match) {
    const values = Object.fromEntries(
      entry.fields.map((field, i) => [
        field,
        field === 'role' ? localizeText(match[i + 1]) : match[i + 1]!,
      ]),
    );
    return translate(`notifications.event.${entry.key}`, values);
  }
  return title === 'Yangi nishon!' ||
    title === 'Parolingiz o‘zgartirildi' ||
    title === 'Parolingiz tiklandi'
    ? localizeText(body)
    : body;
}
