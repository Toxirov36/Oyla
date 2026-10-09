import { useI18n } from '../i18n';

// Display this until reviewed translations of learning content are available.
export function ContentLanguageNotice() {
  const { t, locale } = useI18n();
  return locale === 'uz' ? null : (
    <p className="content-language-notice" role="note">
      {t('content.fallback')}
    </p>
  );
}
