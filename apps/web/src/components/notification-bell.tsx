import { useEffect, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Bell } from 'lucide-react';
import { useNotificationCount } from '../hooks/use-notifications';
import { NotificationsPanel } from './notifications/panel';
import './notifications/notifications.css';
import { useI18n } from '../i18n';

function useMobilePanel() {
  const [mobile, setMobile] = useState(
    () =>
      typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 760px)').matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(max-width: 760px)');
    const change = () => setMobile(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  return mobile;
}
export function NotificationBell() {
  const { t } = useI18n();
  const query = useNotificationCount();
  const count = query.data?.unreadCount || 0;
  const [open, setOpen] = useState(false);
  const mobile = useMobilePanel();
  const trigger = (
    <Tooltip.Trigger asChild>
      <button
        type="button"
        className="notice-bell"
        aria-label={t(count ? 'notifications.openUnread' : 'notifications.open', { count })}
      >
        <Bell size={21} />
        {count > 0 && (
          <span className="notice-bell-badge" aria-hidden="true">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
    </Tooltip.Trigger>
  );
  const panel = mobile ? (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="notice-sheet-overlay" />
        <Dialog.Content className="notice-sheet notice-surface" aria-describedby={undefined}>
          <NotificationsPanel
            title={<Dialog.Title>{t('notifications.title')}</Dialog.Title>}
            close={() => setOpen(false)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  ) : (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="notice-popover notice-surface"
          sideOffset={12}
          align="end"
          collisionPadding={12}
          aria-label={t('notifications.panel')}
        >
          <NotificationsPanel close={() => setOpen(false)} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        {panel}
        <Tooltip.Portal>
          <Tooltip.Content className="notice-tooltip notice-surface" sideOffset={8}>
            {t('notifications.title')}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
