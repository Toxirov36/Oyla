import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { z } from 'zod';
import uzValidation from 'zod/v4/locales/uz.js';
import ruValidation from 'zod/v4/locales/ru.js';
import enValidation from 'zod/v4/locales/en.js';
import uz from './resources/uz/common.json';

export const locales = ['uz', 'ru', 'en'] as const;
export type Locale = (typeof locales)[number];
export type TranslationKey = keyof typeof uz;
export const languageNames: Record<Locale, string> = {
  uz: 'O‘zbekcha',
  ru: 'Русский',
  en: 'English',
};
export const localeTags: Record<Locale, string> = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };
const storageKey = 'bilify.locale';
const manualKey = 'bilify.locale.manual';
let ephemeralChoice: Locale | null = null;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && locales.includes(value as Locale);
}
export function storedLocale(): { locale: Locale; manual: boolean } | null {
  try {
    const locale = localStorage.getItem(storageKey);
    return isLocale(locale)
      ? { locale, manual: localStorage.getItem(manualKey) === 'true' }
      : ephemeralChoice
        ? { locale: ephemeralChoice, manual: true }
        : null;
  } catch {
    return ephemeralChoice ? { locale: ephemeralChoice, manual: true } : null;
  }
}

void i18n.use(initReactI18next).init({
  resources: { uz: { common: uz } },
  lng: 'uz',
  supportedLngs: [...locales],
  fallbackLng: 'uz',
  defaultNS: 'common',
  keySeparator: false,
  nsSeparator: false,
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export function getLocale(): Locale {
  return isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'uz';
}
const loading = new Map<Locale, Promise<void>>();
async function loadLocale(locale: Locale) {
  if (i18n.hasResourceBundle(locale, 'common')) return;
  let pending = loading.get(locale);
  if (!pending) {
    pending = (
      locale === 'ru' ? import('./resources/ru/common.json') : import('./resources/en/common.json')
    )
      .then(({ default: resource }) => {
        i18n.addResourceBundle(locale, 'common', resource);
      })
      .finally(() => {
        loading.delete(locale);
      });
    loading.set(locale, pending);
  }
  await pending;
}
export async function initializeLocale() {
  const stored = storedLocale();
  if (stored) await selectLocale(stored.locale, stored.manual);
}
export async function selectLocale(locale: Locale, manual = true) {
  if (!isLocale(locale)) throw new Error('Unsupported interface language');
  await loadLocale(locale);
  ephemeralChoice = manual ? locale : null;
  try {
    localStorage.setItem(storageKey, locale);
    localStorage.setItem(manualKey, String(manual));
  } catch {
    // The interface remains usable when browser storage is unavailable.
  }
  await i18n.changeLanguage(locale);
}
export function translate(key: string, params?: Record<string, string | number>) {
  return i18n.t(key, params);
}
const messageKeys = new Map<string, string>();
function indexMessages(resource: Record<string, string>) {
  for (const [key, value] of Object.entries(resource)) {
    if (!value.includes('{{') && (!messageKeys.has(value) || key.startsWith('catalog.')))
      messageKeys.set(value, key);
  }
}
indexMessages(uz);
/** Localize known system/catalog text; preserve names and custom content verbatim. */
export function localizeText(value: string | undefined | null) {
  if (!value) return value ?? '';
  const key = messageKeys.get(value);
  return key ? translate(key) : value;
}
export function useI18n() {
  const { t } = useTranslation('common');
  return { t, locale: getLocale() };
}

function updateDocumentLanguage() {
  if (typeof document !== 'undefined') document.documentElement.lang = getLocale();
  const locale = getLocale();
  z.config({ uz: uzValidation, ru: ruValidation, en: enValidation }[locale]());
  indexMessages(i18n.getResourceBundle(locale, 'common') as Record<string, string>);
}
i18n.on('languageChanged', updateDocumentLanguage);
updateDocumentLanguage();
export default i18n;
