import type { User } from './types';
import { getLocale, translate, localizeText } from '../i18n';

let token: string | null = null;
let refreshing: Promise<{ accessToken: string; user: User }> | null = null;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: { field: string; messages: string[] }[] = [],
    public code?: string,
  ) {
    super(message);
  }
}
export function setToken(value: string | null) {
  token = value;
}
export function clearSession(message?: string) {
  if (message) sessionStorage.setItem('oyla-auth-notice', message);
  token = null;
  window.dispatchEvent(new Event('sessionexpired'));
}
export async function refreshSession() {
  if (!refreshing)
    refreshing = fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Accept-Language': getLocale() },
    })
      .then(async (response) => {
        if (!response.ok)
          throw new ApiError(
            translate('errors.sessionExpired'),
            response.status,
            [],
            'SESSION_EXPIRED',
          );
        const session = (await response.json()) as { accessToken: string; user: User };
        token = session.accessToken;
        return session;
      })
      .finally(() => {
        refreshing = null;
      });
  return refreshing;
}
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; retry?: boolean; responseType?: 'blob' } = {},
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method: options.method || 'GET',
    credentials: 'include',
    headers: {
      'Accept-Language': getLocale(),
      ...(options.body === undefined || options.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options.body === undefined
      ? {}
      : { body: options.body instanceof FormData ? options.body : JSON.stringify(options.body) }),
  });
  if (response.status === 401 && !path.startsWith('/auth/') && options.retry !== false) {
    try {
      await refreshSession();
    } catch {
      clearSession();
      throw new ApiError(translate('errors.sessionExpired'), 401, [], 'SESSION_EXPIRED');
    }
    return api(path, { ...options, retry: false });
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
      errors?: { field: string; messages: string[] }[];
    };
    throw new ApiError(
      data.message || translate('errors.connection'),
      response.status,
      data.errors || [],
      data.code,
    );
  }
  return (options.responseType === 'blob' ? response.blob() : response.json()) as Promise<T>;
}
export const errorText = (error: unknown) => {
  if (error instanceof ApiError && error.code) {
    const key = error.code === 'SESSION_EXPIRED' ? 'errors.sessionExpired' : `errors.${error.code}`;
    const message = translate(key);
    if (message !== key) return message;
  }
  return error instanceof Error ? localizeText(error.message) : translate('errors.unexpected');
};
