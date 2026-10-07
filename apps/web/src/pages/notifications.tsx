import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Check, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, errorText } from '../lib/api';
import type { NotificationList } from '../lib/types';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  dateLabel,
} from '../components/ui';

export default function NotificationsPage() {
  const cache = useQueryClient();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const query = useQuery({
    queryKey: ['notifications', 'list', page, unreadOnly],
    queryFn: () =>
      api<NotificationList>(`/notifications?page=${page}&limit=20&unreadOnly=${unreadOnly}`),
    refetchInterval: 30000,
  });
  const mark = async (id?: string) => {
    setError('');
    setBusy(id || 'all');
    try {
      await api(id ? `/notifications/${id}/read` : '/notifications/read-all', {
        method: 'PATCH',
        body: {},
      });
      if (!id || unreadOnly) setPage(1);
      await cache.invalidateQueries({ queryKey: ['notifications'] });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const data = query.data;
  return (
    <>
      <PageHeader
        className="notification-page-header"
        eyebrow="HISOBINGIZDAGI YANGILIKLAR"
        title="Bildirishnomalar"
        description={`${data.unreadCount} ta o‘qilmagan bildirishnoma`}
        action={
          <Button
            variant="secondary"
            disabled={!data.unreadCount || !!busy}
            onClick={() => void mark()}
          >
            <CheckCheck size={18} />
            Barchasini o‘qish
          </Button>
        }
      />
      <Card>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => {
              setUnreadOnly(e.target.checked);
              setPage(1);
            }}
          />
          Faqat o‘qilmaganlar
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {data.items.length ? (
          <ul className="notification-list">
            {data.items.map((item) => (
              <li key={item.id} className={`notification-item ${item.readAt ? '' : 'unread'}`}>
                <span className="square-icon blue" aria-hidden="true">
                  <Bell size={20} />
                </span>
                <div className="notification-content">
                  <div className="notification-heading">
                    <h2>{item.title}</h2>
                    {!item.readAt && <span className="pill">Yangi</span>}
                  </div>
                  <p>{item.body}</p>
                  <time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time>
                  <div className="notification-actions">
                    {item.link?.startsWith('/') &&
                      !item.link.startsWith('//') &&
                      !item.link.includes('\\') && (
                        <Link
                          to={item.link}
                          className="btn btn-ghost"
                          onClick={() => {
                            if (!item.readAt) void mark(item.id);
                          }}
                        >
                          Batafsil
                          <ArrowRight size={16} />
                        </Link>
                      )}
                    {!item.readAt && (
                      <Button
                        variant="ghost"
                        disabled={!!busy}
                        onClick={() => void mark(item.id)}
                        aria-label={`${item.title}: o‘qilgan deb belgilash`}
                      >
                        <Check size={16} />
                        O‘qilgan deb belgilash
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={
              unreadOnly ? 'O‘qilmagan bildirishnomalar yo‘q' : 'Hozircha bildirishnomalar yo‘q'
            }
            description="Yangi topshiriq, nishon va hisob yangiliklari shu yerda ko‘rinadi."
          />
        )}
        <nav className="pagination" aria-label="Bildirishnomalar sahifalari">
          <Button
            variant="secondary"
            aria-label="Oldingi sahifa"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={17} />
          </Button>
          <span>
            {page} / {Math.max(1, Math.ceil(data.total / 20))}
          </span>
          <Button
            variant="secondary"
            aria-label="Keyingi sahifa"
            disabled={page * 20 >= data.total}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={17} />
          </Button>
        </nav>
      </Card>
    </>
  );
}
