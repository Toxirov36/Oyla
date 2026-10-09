import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, refreshSession, setToken } from './api';
import type { Profile, User } from './types';
import { getLocale, selectLocale, storedLocale, type Locale } from '../i18n';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (
    data: { email: string; password: string; name?: string; grade?: number },
    register?: boolean,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<void>;
  changeLocale: (locale: Locale) => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);
export const homeFor = (user: User) =>
  user.role === 'ADMIN' ? '/admin' : user.role === 'TEACHER' ? '/teacher' : '/dashboard';
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const cache = useQueryClient();
  const sessionEpoch = useRef(0);
  const restoreLocale = async (account: User) => {
    const stored = storedLocale();
    if (!stored?.manual) {
      try {
        await selectLocale(account.preferredLocale ?? 'uz', false);
      } catch {
        // A temporarily unavailable translation bundle must not block the account.
      }
      return account;
    }
    if (stored.locale === (account.preferredLocale ?? 'uz')) return account;
    try {
      const profile = await api<Profile>('/users/me/profile', {
        method: 'PATCH',
        body: { preferredLocale: stored.locale },
      });
      return profile.user;
    } catch {
      // A preference sync failure must not prevent a successful sign-in.
      return account;
    }
  };
  useEffect(() => {
    let alive = true;
    const epoch = sessionEpoch.current;
    refreshSession()
      .then(async (session) => {
        if (!alive || epoch !== sessionEpoch.current) return;
        const account = await restoreLocale(session.user);
        if (alive && epoch === sessionEpoch.current) setUser(account);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    const expired = () => {
      sessionEpoch.current++;
      setUser(null);
      cache.clear();
    };
    window.addEventListener('sessionexpired', expired);
    return () => {
      alive = false;
      window.removeEventListener('sessionexpired', expired);
    };
  }, [cache]);
  const signIn: AuthState['signIn'] = async (data, register = false) => {
    const result = await api<{ accessToken: string; user: User }>(
      register ? '/auth/register' : '/auth/login',
      { method: 'POST', body: data },
    );
    cache.clear();
    sessionEpoch.current++;
    setToken(result.accessToken);
    setUser(await restoreLocale(result.user));
  };
  const signOut = async () => {
    sessionEpoch.current++;
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setToken(null);
      setUser(null);
      cache.clear();
    }
  };
  const reloadUser = async () => {
    const epoch = sessionEpoch.current;
    const account = await api<User>('/auth/me');
    if (epoch === sessionEpoch.current) setUser(account);
  };
  const changeLocale: AuthState['changeLocale'] = async (locale) => {
    await selectLocale(locale);
    if (!user) return;
    const epoch = sessionEpoch.current;
    const profile = await api<Profile>('/users/me/profile', {
      method: 'PATCH',
      body: { preferredLocale: locale },
    });
    if (epoch !== sessionEpoch.current || locale !== getLocale()) return;
    setUser((current) => (current?.id === profile.user.id ? profile.user : current));
    cache.setQueryData(['profile'], profile);
  };
  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, reloadUser, changeLocale }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is required');
  return value;
}
