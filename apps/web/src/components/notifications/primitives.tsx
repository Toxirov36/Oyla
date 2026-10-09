import { useI18n, localizeText } from '../../i18n';
import * as Tabs from '@radix-ui/react-tabs';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Link } from 'react-router-dom';
import {
  Award,
  BellOff,
  CheckCheck,
  ClipboardList,
  Info,
  LockKeyhole,
  Mail,
  MailOpen,
  MoreHorizontal,
  ShieldCheck,
  Trash2,
  Users,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useId, type ReactNode } from 'react';
import type { Notification, NotificationType } from '../../lib/types';
import {
  notificationTime,
  notificationTimestamp,
  safeNotificationLink,
  notificationBody,
} from '../../lib/notifications';

const icons = {
  FRIEND: Users,
  ASSIGNMENT: ClipboardList,
  BADGE: Award,
  ACCOUNT: ShieldCheck,
  SECURITY: LockKeyhole,
  SYSTEM: Info,
  WARNING: TriangleAlert,
};
export function NotificationHeader({
  count,
  busy,
  markAll,
  close,
  title,
}: {
  count: number;
  busy: boolean;
  markAll: () => void;
  close?: () => void;
  title?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <header className="notice-header">
      <div className="notice-header-title">
        {title || <h2>{t('notifications.title')}</h2>}
        {count > 0 && (
          <span className="notice-new-count">{t('notifications.newCount', { count })}</span>
        )}
      </div>
      <div className="notice-header-actions">
        <button
          className="notice-icon-button"
          disabled={!count || busy}
          onClick={markAll}
          aria-label={t('notifications.readAll')}
          title={t('notifications.markAll')}
        >
          <CheckCheck size={18} />
        </button>
        {close && (
          <button
            className="notice-icon-button"
            onClick={close}
            aria-label={t('notifications.close')}
          >
            <X size={18} />
          </button>
        )}
      </div>
    </header>
  );
}
export function NotificationFilters({
  unreadOnly,
  onChange,
  toolbar,
  children,
}: {
  unreadOnly: boolean;
  onChange: (value: boolean) => void;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const value = unreadOnly ? 'unread' : 'all';
  return (
    <Tabs.Root
      className="notice-filters"
      value={value}
      onValueChange={(value) => onChange(value === 'unread')}
    >
      <div className="notice-filter-row">
        <Tabs.List className="notice-tabs" aria-label={t('notifications.filters')}>
          <Tabs.Trigger value="all">{t('notifications.all')}</Tabs.Trigger>
          <Tabs.Trigger value="unread">{t('notifications.unread')}</Tabs.Trigger>
        </Tabs.List>
        {toolbar}
      </div>
      <Tabs.Content value={value} className="notice-tab-panel">
        {children}
      </Tabs.Content>
    </Tabs.Root>
  );
}
export function NotificationItem({
  item,
  busy,
  onOpen,
  setRead,
  remove,
  compact = false,
}: {
  item: Notification;
  busy: boolean;
  onOpen: (item: Notification) => void;
  setRead: (item: Notification, read: boolean) => void;
  remove: (item: Notification) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const descriptionId = useId();
  const type: NotificationType = item.type || 'SYSTEM';
  const Icon = icons[type] || Info;
  const link = safeNotificationLink(item.link);
  const title = localizeText(item.title);
  const content = (
    <>
      <span className={`notice-kind-icon ${type.toLowerCase()}`} aria-hidden="true">
        <Icon size={19} />
      </span>
      <span className="notice-item-copy">
        <span className="notice-item-title">
          {title}
          {!item.readAt && (
            <>
              <span className="notice-unread-dot" aria-hidden="true" />
              <span className="sr-only"> {t('notifications.unreadSuffix')}</span>
            </>
          )}
        </span>
        <span id={descriptionId} className="notice-item-description">
          {notificationBody(item.title, item.body)}
        </span>
        <time dateTime={item.createdAt} title={notificationTimestamp(item.createdAt)}>
          {notificationTime(item.createdAt)}
        </time>
      </span>
    </>
  );
  return (
    <li className={`notice-item ${!item.readAt ? 'is-unread' : ''} ${compact ? 'is-compact' : ''}`}>
      {link ? (
        <Link
          className="notice-item-main"
          to={link}
          onClick={(event) => {
            if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
              event.preventDefault();
              if (!busy) onOpen(item);
            } else if (!item.readAt) setRead(item, true);
          }}
          aria-label={item.readAt ? title : t('notifications.unreadLabel', { title })}
          aria-describedby={descriptionId}
        >
          {content}
        </Link>
      ) : (
        <button
          className="notice-item-main"
          disabled={busy}
          onClick={() => onOpen(item)}
          aria-label={item.readAt ? title : t('notifications.unreadLabel', { title })}
          aria-describedby={descriptionId}
        >
          {content}
        </button>
      )}
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <button
            className="notice-icon-button notice-item-menu"
            aria-label={t('notifications.actions', { title })}
            disabled={busy}
          >
            <MoreHorizontal size={18} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="notice-menu notice-surface" sideOffset={4} align="end">
            <DropdownMenu.Item onSelect={() => setRead(item, !item.readAt)}>
              {item.readAt ? <Mail size={16} /> : <MailOpen size={16} />}
              {item.readAt ? t('notifications.markUnread') : t('notifications.markRead')}
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item className="notice-menu-delete" onSelect={() => remove(item)}>
              <Trash2 size={16} />
              {t('notifications.remove')}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </li>
  );
}
export function NotificationEmptyState({ unreadOnly = false }: { unreadOnly?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="notice-empty">
      <span className="notice-empty-icon">
        <BellOff size={24} />
      </span>
      <h3>{unreadOnly ? t('notifications.allRead') : t('notifications.empty')}</h3>
      <p>{t('notifications.emptyHelp')}</p>
    </div>
  );
}
export function NotificationSkeleton() {
  const { t } = useI18n();
  return (
    <div className="notice-loading" role="status" aria-label={t('notifications.loading')}>
      {[1, 2, 3, 4].map((key) => (
        <div className="notice-skeleton-row" key={key}>
          <span className="skeleton notice-skeleton-icon" />
          <div>
            <span className="skeleton notice-skeleton-title" />
            <span className="skeleton notice-skeleton-description" />
            <span className="skeleton notice-skeleton-time" />
          </div>
        </div>
      ))}
    </div>
  );
}
export function NotificationErrorState({ retry }: { retry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="notice-empty" role="alert">
      <TriangleAlert size={24} />
      <h3>{t('notifications.loadError')}</h3>
      <p>{t('notifications.connectionError')}</p>
      <button className="notice-retry" onClick={retry}>
        {t('common.retry')}
      </button>
    </div>
  );
}
