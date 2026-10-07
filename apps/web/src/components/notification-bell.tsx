import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { api } from '../lib/api';
export function NotificationBell() {
  const query = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api<{ unreadCount: number }>('/notifications/unread-count'),
    refetchInterval: 30000,
  });
  const count = query.data?.unreadCount || 0;
  return (
    <Link
      to="/notifications"
      className="notification-bell"
      aria-label={`Bildirishnomalarni ochish${count ? `: ${count} ta o‘qilmagan` : ''}`}
    >
      <Bell size={22} />
      {count > 0 && (
        <span className="notification-count" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
