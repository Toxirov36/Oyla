import { useI18n } from '../../i18n';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import {
  useNotificationActions,
  useNotificationCount,
  useNotifications,
} from '../../hooks/use-notifications';
import { safeNotificationLink } from '../../lib/notifications';
import { errorText } from '../../lib/api';
import type { Notification } from '../../lib/types';
import {
  NotificationEmptyState,
  NotificationErrorState,
  NotificationFilters,
  NotificationHeader,
  NotificationItem,
  NotificationSkeleton,
} from './primitives';

export function NotificationsPanel({ close, title }: { close: () => void; title?: ReactNode }) {
  const { t } = useI18n();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const query = useNotifications({ limit: 10, unreadOnly });
  const count = useNotificationCount();
  const actions = useNotificationActions();
  const navigate = useNavigate();
  const openItem = async (item: Notification) => {
    try {
      if (!item.readAt) await actions.setRead(item, true);
      const href = safeNotificationLink(item.link);
      if (href) {
        navigate(href);
        close();
      }
    } catch {
      /* The mutation error is displayed inside the panel. */
    }
  };
  return (
    <>
      <NotificationHeader
        title={title}
        count={count.data?.unreadCount ?? query.data?.unreadCount ?? 0}
        busy={actions.busy}
        markAll={() => {
          void actions.readAll().catch(() => {});
        }}
        close={close}
      />
      <div className="notice-panel-body">
        <NotificationFilters unreadOnly={unreadOnly} onChange={setUnreadOnly}>
          {actions.error && (
            <p role="alert" className="notice-action-error">
              {errorText(actions.error)}
            </p>
          )}
          {query.isPending ? (
            <NotificationSkeleton />
          ) : query.error ? (
            <NotificationErrorState retry={() => void query.refetch()} />
          ) : query.data?.items.length ? (
            <ul className="notice-list">
              {query.data.items.map((item) => (
                <NotificationItem
                  key={item.id}
                  item={item}
                  busy={actions.busy}
                  compact
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
          ) : (
            <NotificationEmptyState unreadOnly={unreadOnly} />
          )}
        </NotificationFilters>
      </div>
      <footer className="notice-footer">
        <Link to="/notifications" onClick={close}>
          {t('notifications.viewAll')}
          <ArrowRight size={16} />
        </Link>
      </footer>
    </>
  );
}
