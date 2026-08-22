'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { ApiUser } from '@/lib/types';

interface AuthContextValue {
  user: ApiUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Uploads a base64 avatar and updates the cached user's avatarUrl. */
  uploadAvatar: (data: string, mime: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = (await res.json()) as { user: ApiUser | null };
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(d.error ?? '登录失败');
    }
    const d = (await res.json()) as { user: ApiUser };
    setUser(d.user);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(d.error ?? '注册失败');
    }
    const d = (await res.json()) as { user: ApiUser };
    setUser(d.user);
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  }, []);

  // Persist an uploaded avatar: POST base64 to the API, then update the local
  // user object so the header/avatar reflect the new image immediately.
  const uploadAvatar = useCallback(async (data: string, mime: string) => {
    const res = await fetch('/api/auth/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, mime }),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(d.error ?? '上传头像失败');
    }
    const d = (await res.json()) as { avatarUrl: string };
    setUser((prev) => (prev ? { ...prev, avatarUrl: d.avatarUrl } : prev));
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin, login, register, logout, refresh, uploadAvatar }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
