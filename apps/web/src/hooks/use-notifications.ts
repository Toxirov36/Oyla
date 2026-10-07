import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Notification, NotificationList, NotificationType } from '../lib/types';

export interface NotificationFilters {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
  search?: string;
}
type Count = { unreadCount: number };
type Action =
  | { kind: 'read'; item: Notification; read: boolean }
  | { kind: 'delete'; item: Notification }
  | { kind: 'all' };
export function useNotificationCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', user?.id, 'unread-count'],
    enabled: !!user,
    queryFn: () => api<Count>('/notifications/unread-count'),
    refetchInterval: 30000,
  });
}
export function useNotifications(filters: NotificationFilters, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', user?.id, 'list', filters],
    enabled: enabled && !!user,
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(filters.page || 1),
        limit: String(filters.limit || 20),
        unreadOnly: String(!!filters.unreadOnly),
      });
      if (filters.type) params.set('type', filters.type);
      if (filters.search?.trim()) params.set('search', filters.search.trim());
      return api<NotificationList>(`/notifications?${params}`);
    },
    refetchInterval: enabled ? 30000 : false,
  });
}
export function useNotificationActions() {
  const cache = useQueryClient();
  const { user } = useAuth();
  const prefix = ['notifications', user?.id];
  const mutationKey = [...prefix, 'actions'];
  const busy = useIsMutating({ mutationKey }) > 0;
  const mutation = useMutation({
    mutationKey,
    mutationFn: (action: Action) => {
      if (action.kind === 'all')
        return api('/notifications/read-all', { method: 'PATCH', body: {} });
      if (action.kind === 'delete')
        return api(`/notifications/${action.item.id}`, { method: 'DELETE' });
      return api(`/notifications/${action.item.id}/read`, {
        method: 'PATCH',
        body: { read: action.read },
      });
    },
    onMutate: async (action) => {
      await cache.cancelQueries({ queryKey: prefix });
      const snapshots = cache.getQueriesData<NotificationList | Count>({ queryKey: prefix });
      const now = new Date().toISOString();
      const delta =
        action.kind === 'all'
          ? 0
          : action.kind === 'delete'
            ? action.item.readAt
              ? 0
              : -1
            : action.read
              ? action.item.readAt
                ? 0
                : -1
              : action.item.readAt
                ? 1
                : 0;
      for (const [key, data] of snapshots) {
        if (!data) continue;
        const unreadCount = action.kind === 'all' ? 0 : Math.max(0, data.unreadCount + delta);
        if (!('items' in data)) {
          cache.setQueryData(key, { unreadCount });
          continue;
        }
        const filters = key[3] as NotificationFilters;
        let items = data.items;
        let total = data.total;
        if (action.kind === 'all') {
          items = filters.unreadOnly
            ? []
            : items.map((item) => ({ ...item, readAt: item.readAt || now }));
          if (filters.unreadOnly) total = 0;
        } else {
          const included = items.some((item) => item.id === action.item.id);
          const remove =
            action.kind === 'delete' ||
            (action.kind === 'read' && action.read && filters.unreadOnly);
          if (remove) {
            items = items.filter((item) => item.id !== action.item.id);
            if (included) total = Math.max(0, total - 1);
          } else if (action.kind === 'read')
            items = items.map((item) =>
              item.id === action.item.id
                ? { ...item, readAt: action.read ? item.readAt || now : null }
                : item,
            );
        }
        cache.setQueryData(key, { ...data, items, total, unreadCount });
      }
      return snapshots;
    },
    onError: (_error, _action, snapshots) => {
      for (const [key, data] of snapshots || []) cache.setQueryData(key as QueryKey, data);
    },
    onSettled: () => cache.invalidateQueries({ queryKey: prefix }),
  });
  return {
    busy,
    error: mutation.error,
    setRead: (item: Notification, read: boolean) =>
      mutation.mutateAsync({ kind: 'read', item, read }),
    remove: (item: Notification) => mutation.mutateAsync({ kind: 'delete', item }),
    readAll: () => mutation.mutateAsync({ kind: 'all' }),
  };
}
