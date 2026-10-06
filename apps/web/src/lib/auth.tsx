import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, refreshSession, setToken } from './api';
import type { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (
    data: { email: string; password: string; name?: string; grade?: number },
    register?: boolean,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);
export const homeFor = (user: User) =>
  user.role === 'ADMIN' ? '/admin' : user.role === 'TEACHER' ? '/teacher' : '/dashboard';
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const cache = useQueryClient();
  useEffect(() => {
    let alive = true;
    refreshSession()
      .then((session) => {
        if (alive) setUser(session.user);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    const expired = () => {
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
    setToken(result.accessToken);
    setUser(result.user);
  };
  const signOut = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setToken(null);
      setUser(null);
      cache.clear();
    }
  };
  const reloadUser = async () => {
    setUser(await api<User>('/auth/me'));
  };
  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is required');
  return value;
}
