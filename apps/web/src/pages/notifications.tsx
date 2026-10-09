import { translate as tx, useI18n as usePageLocale } from '../i18n';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
  useNotificationActions,
  useNotificationCount,
  useNotifications,
} from '../hooks/use-notifications';
import {
  notificationDateGroup,
  notificationTypes,
  safeNotificationLink,
} from '../lib/notifications';
import type { Notification, NotificationType } from '../lib/types';
import { errorText } from '../lib/api';
import { PageHeader } from '../components/ui';
import {
  NotificationEmptyState,
  NotificationErrorState,
  NotificationFilters,
  NotificationItem,
  NotificationSkeleton,
} from '../components/notifications/primitives';

export default function NotificationsPage() {
  usePageLocale();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [type, setType] = useState<NotificationType | ''>('');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useNotifications({
    page,
    limit: 20,
    unreadOnly,
    type: type || undefined,
    search: term,
  });
  const count = useNotificationCount();
  const actions = useNotificationActions();
  const navigate = useNavigate();
  useEffect(() => {
    if (query.data && page > Math.max(1, Math.ceil(query.data.total / 20)))
      setPage(Math.max(1, Math.ceil(query.data.total / 20)));
  }, [query.data, page]);
  const groups = new Map<string, Notification[]>();
  for (const item of query.data?.items || []) {
    const group = notificationDateGroup(item.createdAt);
    groups.set(group, [...(groups.get(group) || []), item]);
  }
  const openItem = async (item: Notification) => {
    try {
      if (!item.readAt) await actions.setRead(item, true);
      const link = safeNotificationLink(item.link);
      if (link) navigate(link);
    } catch {
      /* Keep the list visible when the action fails. */
    }
  };
  return (
    <div className="notice-page notice-surface">
      <PageHeader
        className="notification-page-header"
        title={tx('notifications.title')}
        description={tx('pages.notifications.unreadLatestUpdatesForYourAccount', {
          value1: count.data?.unreadCount ?? query.data?.unreadCount ?? 0,
        })}
        action={
          <button
            className="notice-page-read-all"
            disabled={!count.data?.unreadCount || actions.busy}
            onClick={() => {
              void actions.readAll().catch(() => {});
            }}
          >
            <CheckCheck size={17} />
            {tx('notifications.readAll')}
          </button>
        }
      />
      <div className="notice-inbox">
        <NotificationFilters
          unreadOnly={unreadOnly}
          onChange={(value) => {
            setUnreadOnly(value);
            setPage(1);
          }}
          toolbar={
            <div className="notice-toolbar">
              <label className="notice-search">
                <Search size={16} />
                <input
                  aria-label={tx('pages.notifications.searchNotifications')}
                  placeholder={tx('pages.notifications.search')}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <select
                aria-label={tx('pages.notifications.notificationType')}
                value={type}
                onChange={(e) => {
                  setType(e.target.value as NotificationType | '');
                  setPage(1);
                }}
              >
                <option value="">{tx('pages.notifications.allTypes')}</option>
                {notificationTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          {actions.error && (
            <p role="alert" className="notice-action-error">
              {errorText(actions.error)}
            </p>
          )}
          {query.isPending ? (
            <NotificationSkeleton />
          ) : query.error ? (
            <NotificationErrorState retry={() => void query.refetch()} />
          ) : groups.size ? (
            [...groups].map(([label, items]) => (
              <section className="notice-date-group" key={label}>
                <h2>{label}</h2>
                <ul className="notice-list">
                  {items.map((item) => (
                    <NotificationItem
                      key={item.id}
                      item={item}
                      busy={actions.busy}
                      onOpen={(value) => void openItem(value)}
                      setRead={(value, read) => {
                        void actions.setRead(value, read).catch(() => {});
                      }}
                      remove={(value) => {
                        void actions.remove(value).catch(() => {});
                      }}
                    />
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <NotificationEmptyState unreadOnly={unreadOnly} />
          )}
        </NotificationFilters>
        <nav className="notice-pagination" aria-label={tx('pages.notifications.notificationPages')}>
          <span>{tx('pages.notifications.notifications', { value1: query.data?.total || 0 })}</span>
          <div>
            <button
              className="notice-icon-button"
              aria-label={tx('pages.notifications.previousPage')}
              disabled={page === 1 || query.isPending}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              {page} / {Math.max(1, Math.ceil((query.data?.total || 0) / 20))}
            </span>
            <button
              className="notice-icon-button"
              aria-label={tx('pages.notifications.nextPage')}
              disabled={page * 20 >= (query.data?.total || 0) || query.isPending}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
