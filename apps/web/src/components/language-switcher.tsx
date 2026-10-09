import { useState } from 'react';
import { AlertCircle, ChevronDown, Check, LoaderCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { languageNames, locales, isLocale, useI18n, type Locale } from '../i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

function FlagUz({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" className={className} aria-hidden="true">
      <rect width="32" height="7.4" fill="#0099b5" />
      <rect y="7.4" width="32" height="0.6" fill="#ce1126" />
      <rect y="8" width="32" height="8" fill="#ffffff" />
      <rect y="16" width="32" height="0.6" fill="#ce1126" />
      <rect y="16.6" width="32" height="7.4" fill="#1eb53a" />
      <circle cx="5.2" cy="3.7" r="2.2" fill="#ffffff" />
      <circle cx="5.9" cy="3.7" r="1.8" fill="#0099b5" />
      <g fill="#ffffff">
        <circle cx="9.2" cy="1.9" r="0.4" />
        <circle cx="10.8" cy="1.9" r="0.4" />
        <circle cx="12.4" cy="1.9" r="0.4" />

        <circle cx="9.2" cy="3.7" r="0.4" />
        <circle cx="10.8" cy="3.7" r="0.4" />
        <circle cx="12.4" cy="3.7" r="0.4" />
        <circle cx="14" cy="3.7" r="0.4" />

        <circle cx="7.6" cy="5.5" r="0.4" />
        <circle cx="9.2" cy="5.5" r="0.4" />
        <circle cx="10.8" cy="5.5" r="0.4" />
        <circle cx="12.4" cy="5.5" r="0.4" />
        <circle cx="14" cy="5.5" r="0.4" />
      </g>
    </svg>
  );
}

function FlagRu({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" className={className} aria-hidden="true">
      <rect width="32" height="8" fill="#ffffff" />
      <rect y="8" width="32" height="8" fill="#0039a6" />
      <rect y="16" width="32" height="8" fill="#d52b1e" />
    </svg>
  );
}

function FlagEn({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" className={className} aria-hidden="true">
      <defs>
        <clipPath id="uk-flag-clip">
          <rect width="32" height="24" />
        </clipPath>
      </defs>
      <g clipPath="url(#uk-flag-clip)">
        <rect width="32" height="24" fill="#012169" />
        <path d="M0 0 L32 24 M32 0 L0 24" stroke="#ffffff" strokeWidth="3.6" />
        <path d="M0 0 L32 24 M32 0 L0 24" stroke="#c8102e" strokeWidth="2" />
        <path d="M16 0 V24 M0 12 H32" stroke="#ffffff" strokeWidth="6" />
        <path d="M16 0 V24 M0 12 H32" stroke="#c8102e" strokeWidth="3.6" />
      </g>
    </svg>
  );
}

const languageMeta: Record<
  Locale,
  {
    name: string;
    sub: string;
    code: string;
    Flag: React.ComponentType<{ className?: string }>;
  }
> = {
  uz: {
    name: 'O‘zbekcha',
    sub: 'O‘zbek tili',
    code: 'UZ',
    Flag: FlagUz,
  },
  ru: {
    name: 'Русский',
    sub: 'Русский язык',
    code: 'RU',
    Flag: FlagRu,
  },
  en: {
    name: 'English',
    sub: 'English',
    code: 'ENG',
    Flag: FlagEn,
  },
};

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t, locale } = useI18n();
  const { changeLocale } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const currentMeta = languageMeta[locale] || languageMeta.uz;
  const CurrentFlag = currentMeta.Flag;

  const handleSelect = async (next: Locale) => {
    if (next === locale) {
      setOpen(false);
      return;
    }
    setSaving(true);
    setFailed(false);
    try {
      await changeLocale(next);
      setOpen(false);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`language-control ${className}`}>
      {/* Hidden native select for full accessibility and test compatibility */}
      <label className="sr-only">
        <span>{t('language.label')}</span>
        <select
          value={locale}
          disabled={saving}
          aria-label={t('language.label')}
          onChange={async (event) => {
            const next = event.target.value;
            if (!isLocale(next)) return;
            await handleSelect(next);
          }}
        >
          {locales.map((value) => (
            <option key={value} value={value}>
              {languageNames[value]}
            </option>
          ))}
        </select>
      </label>

      {/* Modern custom dropdown menu */}
      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="language-switcher-trigger"
            aria-label={`${t('language.label')}: ${languageNames[locale]}`}
            aria-expanded={open}
            disabled={saving}
          >
            <span className="lang-flag-badge" aria-hidden="true">
              <CurrentFlag className="lang-flag-svg" />
            </span>
            <span className="lang-label-text">{currentMeta.code}</span>
            <span className="lang-chevron-wrap" aria-hidden="true">
              {saving ? (
                <LoaderCircle size={13} className="spin text-[var(--primary)]" />
              ) : (
                <ChevronDown size={14} className="lang-chevron" />
              )}
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="lang-dropdown-content"
        >
          <div className="lang-dropdown-header">
            <span>{t('language.label')}</span>
          </div>

          <DropdownMenuSeparator className="lang-dropdown-sep" />

          <div className="lang-options-list" role="radiogroup" aria-label={t('language.label')}>
            {locales.map((value) => {
              const meta = languageMeta[value];
              const ItemFlag = meta.Flag;
              const isSelected = value === locale;

              return (
                <DropdownMenuItem
                  key={value}
                  className={`lang-menu-item ${isSelected ? 'is-active' : ''}`}
                  onSelect={(e) => {
                    e.preventDefault();
                    void handleSelect(value);
                  }}
                >
                  <span className="lang-menu-flag" aria-hidden="true">
                    <ItemFlag className="lang-flag-svg" />
                  </span>
                  <div className="lang-menu-text">
                    <span className="lang-menu-title">{languageNames[value]}</span>
                    <span className="lang-menu-sub">{meta.sub}</span>
                  </div>
                  {isSelected && (
                    <span className="lang-menu-check" aria-hidden="true">
                      <Check size={13} strokeWidth={2.8} />
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {failed && (
        <div role="alert" className="language-error">
          <AlertCircle size={14} className="lang-error-icon" aria-hidden="true" />
          <span>{t('language.saveError')}</span>
        </div>
      )}
    </div>
  );
}
