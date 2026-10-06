import { expect, it, vi } from 'vitest';
import { api, ApiError, setToken } from '../src/lib/api';

it('shares one token refresh across simultaneous expired requests', async () => {
  setToken('expired');
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith('/auth/refresh'))
      return Response.json({ accessToken: 'fresh', user: {} });
    const authorization = new Headers(init?.headers).get('Authorization');
    return authorization === 'Bearer fresh'
      ? Response.json({ ok: true })
      : Response.json({}, { status: 401 });
  });
  vi.stubGlobal('fetch', fetcher);
  expect(await Promise.all([api('/test/one'), api('/test/two')])).toEqual([
    { ok: true },
    { ok: true },
  ]);
  expect(
    fetcher.mock.calls.filter(([input]) => String(input).endsWith('/auth/refresh')),
  ).toHaveLength(1);
});
it('expires the session when refresh is rejected', async () => {
  setToken('expired');
  const expired = vi.fn();
  window.addEventListener('sessionexpired', expired);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ message: 'expired' }, { status: 401 })),
  );
  try {
    await expect(api('/protected')).rejects.toBeInstanceOf(ApiError);
    expect(expired).toHaveBeenCalledOnce();
  } finally {
    window.removeEventListener('sessionexpired', expired);
  }
});
