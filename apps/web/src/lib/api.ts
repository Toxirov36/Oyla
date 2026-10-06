import type { User } from './types';

let token: string | null = null;
let refreshing: Promise<{ accessToken: string; user: User }> | null = null;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: { field: string; messages: string[] }[] = [],
  ) {
    super(message);
  }
}
export function setToken(value: string | null) {
  token = value;
}
export async function refreshSession() {
  if (!refreshing)
    refreshing = fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new ApiError('Tizimga qayta kiring.', response.status);
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
  options: { method?: string; body?: unknown; retry?: boolean } = {},
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method: options.method || 'GET',
    credentials: 'include',
    headers: {
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  if (response.status === 401 && !path.startsWith('/auth/') && options.retry !== false) {
    try {
      await refreshSession();
    } catch {
      token = null;
      window.dispatchEvent(new Event('sessionexpired'));
      throw new ApiError('Tizimga qayta kiring.', 401);
    }
    return api(path, { ...options, retry: false });
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      errors?: { field: string; messages: string[] }[];
    };
    throw new ApiError(
      data.message || 'Xizmat bilan bog‘lanishda xatolik.',
      response.status,
      data.errors || [],
    );
  }
  return response.json() as Promise<T>;
}
export const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'Xatolik yuz berdi.';
