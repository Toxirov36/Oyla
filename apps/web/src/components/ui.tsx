import { useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, ArrowRight, LoaderCircle, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ComboboxPortalContext } from './ui/combobox-context';
import { errorText } from '../lib/api';
import { formatDate } from '../lib/locale';
import { useI18n } from '../i18n';

export function Button({
  className = '',
  variant = 'primary',
  busy,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  busy?: boolean;
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} disabled={busy || disabled} {...props}>
      {busy && <LoaderCircle size={17} className="spin" />}
      {children}
    </button>
  );
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className = '',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`page-header ${className}`}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function ProgressBar({ value, tone = 'blue' }: { value: number; tone?: string }) {
  const { t } = useI18n();
  return (
    <div
      className={`progress-track ${tone}`}
      role="progressbar"
      aria-label={t('common.progress')}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="empty-state">
      <div className="empty-orbit">○</div>
      <h3>{title ?? t('common.empty')}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Loading() {
  const { t } = useI18n();
  return (
    <div aria-label={t('common.loading')} role="status" className="loading-grid">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={22} />
      <p>{errorText(error)}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}
export function StatusPill({ status }: { status: string }) {
  const { t } = useI18n();
  return (
    <span className={`pill status-${status.toLowerCase()}`}>
      {(
        {
          DRAFT: t('common.draft'),
          PUBLISHED: t('common.published'),
          ARCHIVED: t('common.archived'),
          COMPLETED: t('common.completed'),
        } as Record<string, string>
      )[status] || status}
    </span>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const { t } = useI18n();
  const portalContainer = useRef<HTMLDivElement>(null);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-overlay" />
        <DialogPrimitive.Content
          ref={portalContainer}
          className={`modal-content ${wide ? 'wide' : ''}`}
          onEscapeKeyDown={(event) => {
            if (portalContainer.current?.querySelector('[data-slot="combobox-content"][data-open]'))
              event.preventDefault();
          }}
        >
          <ComboboxPortalContext.Provider value={portalContainer}>
            <div className="modal-scroll">
              <div className="modal-header">
                <div>
                  <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
                  <DialogPrimitive.Description>
                    {description ?? t('common.modalDescription')}
                  </DialogPrimitive.Description>
                </div>
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" aria-label={t('common.close')}>
                    <X size={20} />
                  </Button>
                </DialogPrimitive.Close>
              </div>
              {children}
            </div>
          </ComboboxPortalContext.Provider>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export function TextLink({ children }: { children: ReactNode }) {
  return (
    <span className="text-link">
      {children}
      <ArrowRight size={16} />
    </span>
  );
}
export function Stat({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  detail?: string;
}) {
  return (
    <Card className="stat">
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </Card>
  );
}
export const dateLabel = (date: string) => formatDate(date);
export * from './ui/select';
export * from './ui/popover';
export * from './ui/datetime-picker';
