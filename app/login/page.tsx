'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password);
      }
      router.push('/me');
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="rounded-2xl bg-surface border border-surface-border shadow-card p-6 sm:p-8">
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors duration-200 cursor-pointer ${
              mode === 'login' ? 'bg-accent text-white' : 'bg-surface-muted text-ink-muted'
            }`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors duration-200 cursor-pointer ${
              mode === 'register' ? 'bg-accent text-white' : 'bg-surface-muted text-ink-muted'
            }`}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-ink mb-1.5">
              用户名
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3-20 位字母、数字或下划线"
              className="w-full rounded-xl border border-surface-border px-4 py-2.5 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none transition-colors duration-200"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
              密码
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              className="w-full rounded-xl border border-surface-border px-4 py-2.5 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none transition-colors duration-200"
            />
          </div>

          {error ? (
            <p className="text-sm text-brand-dark bg-brand/5 border border-brand/20 rounded-lg px-3 py-2">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-full bg-accent text-white font-medium hover:bg-accent-dark disabled:opacity-60 transition-colors duration-200 cursor-pointer"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> 处理中……
              </>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" aria-hidden /> 登录
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" aria-hidden /> 注册并登录
              </>
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-subtle">
          登录即表示你同意以该用户名发布内容 · <Link href="/" className="text-accent hover:underline">返回首页</Link>
        </p>
      </div>
    </div>
  );
}
