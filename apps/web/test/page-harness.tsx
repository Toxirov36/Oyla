import { vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/lib/auth';
import App from '../src/app';
import type { Role, User } from '../src/lib/types';

type Handler = unknown | ((request: { path: string; method: string; body?: unknown }) => unknown);

export const accountFor = (role: Role, extra: Partial<User> = {}): User => ({
  id: '73933e41-9215-48ad-b535-354c7559a5fa',
  name: 'Sinov Foydalanuvchi',
  email: 'sinov@example.uz',
  role,
  createdAt: '2026-01-15T10:00:00Z',
  student: role === 'STUDENT' ? { grade: 6 } : null,
  ...extra,
});

/**
 * Mounts the whole app on `route` as a signed-in `user`. `routes` maps `"METHOD /api/v1/path"`
 * (or just the path for GET) to a JSON body or a function returning one; unmatched requests fail loudly.
 */
export function mountPage(route: string, user: User, routes: Record<string, Handler>) {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    const path = url.pathname;
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
    calls.push({ method, path, body });
    if (path === '/api/v1/auth/refresh') return Response.json({ accessToken: 'unit', user });
    if (path === '/api/v1/auth/me') return Response.json(user);
    if (path === '/api/v1/notifications/unread-count') return Response.json({ unreadCount: 0 });
    const key = [`${method} ${path}`, `${method} ${path}${url.search}`, path].find(
      (k) => k in routes,
    );
    if (!key) throw new Error(`Unexpected unit request: ${method} ${path}${url.search}`);
    const handler = routes[key];
    const result =
      typeof handler === 'function'
        ? (handler as (r: object) => unknown)({ path, method, body })
        : handler;
    if (result instanceof Response) return result;
    return Response.json(result ?? { success: true });
  });
  vi.stubGlobal('fetch', fetcher);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { calls, fetcher, user: userEvent.setup() };
}
