import messages from './locale-messages.json';

export type Locale = 'uz' | 'ru' | 'en';
export function resolveLocale(header?: string): Locale {
  const candidates = (header ?? '')
    .split(',')
    .map((entry, index) => {
      const [tag, ...parameters] = entry.trim().split(';');
      const quality = parameters.find((parameter) => parameter.trim().startsWith('q='));
      const q = quality ? Number(quality.trim().slice(2)) : 1;
      return { locale: tag.toLowerCase().split('-')[0], q, index };
    })
    .filter(({ locale, q }) => ['uz', 'ru', 'en'].includes(locale) && q > 0 && q <= 1);
  candidates.sort((a, b) => b.q - a.q || a.index - b.index);
  return (candidates[0]?.locale as Locale | undefined) ?? 'uz';
}
export function localizedMessage(code: string, locale: Locale): string | undefined {
  const dictionary: Record<string, string> = messages[locale];
  return dictionary[code];
}
export function localizedValidation(code: string, locale: Locale): string {
  const messages = {
    ru: {
      minLength: 'Значение слишком короткое.',
      maxLength: 'Значение слишком длинное.',
      isEmail: 'Введите корректный email.',
      isString: 'Введите текст.',
      isIn: 'Выберите допустимое значение.',
      isUUID: 'Некорректный идентификатор.',
      isInt: 'Введите целое число.',
      min: 'Значение слишком маленькое.',
      max: 'Значение слишком большое.',
      whitelistValidation: 'Это поле нельзя изменять.',
      isNotEmpty: 'Заполните это поле.',
      default: 'Проверьте значение этого поля.',
    },
    en: {
      minLength: 'This value is too short.',
      maxLength: 'This value is too long.',
      isEmail: 'Enter a valid email address.',
      isString: 'Enter text.',
      isIn: 'Select an allowed value.',
      isUUID: 'Invalid identifier.',
      isInt: 'Enter a whole number.',
      min: 'This value is too small.',
      max: 'This value is too large.',
      whitelistValidation: 'This field cannot be changed.',
      isNotEmpty: 'Complete this field.',
      default: 'Check the value of this field.',
    },
  };
  const dictionary: Record<string, string> = messages[locale === 'ru' ? 'ru' : 'en'];
  return dictionary[code] ?? dictionary.default;
}
