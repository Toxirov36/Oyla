import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AlertCircle, ArrowRight, LoaderCircle, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { errorText } from '../lib/api';
import { formatDate } from '../lib/locale';

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
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
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
  return (
    <div
      className={`progress-track ${tone}`}
      role="progressbar"
      aria-label="Progress"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
export function EmptyState({
  title = 'Hozircha ma’lumot yo‘q',
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-orbit">○</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div aria-label="Yuklanmoqda" role="status" className="loading-grid">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={22} />
      <p>{errorText(error)}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Qayta urinish
        </Button>
      )}
    </div>
  );
}
export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`pill status-${status.toLowerCase()}`}>
      {(
        {
          DRAFT: 'Qoralama',
          PUBLISHED: 'Chop etilgan',
          ARCHIVED: 'Arxiv',
          COMPLETED: 'Bajarilgan',
        } as Record<string, string>
      )[status] || status}
    </span>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description = 'Ma’lumotlarni kiriting va saqlang.',
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
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-overlay" />
        <DialogPrimitive.Content className={`modal-content ${wide ? 'wide' : ''}`}>
          <div className="modal-header">
            <div>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description>{description}</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" aria-label="Yopish">
                <X size={20} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          {children}
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
