'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from './AuthProvider';

const KEY = (id: string) => `fanhub:liked:${id}`;

export default function LikeButton({
  id,
  initialCount,
  size = 'md',
  likedByMe,
}: {
  id: string;
  initialCount: number;
  size?: 'sm' | 'md';
  likedByMe?: boolean;
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  // Resolve initial state: for logged-in users the server is authoritative;
  // anonymous visitors fall back to the per-device localStorage flag.
  useEffect(() => {
    if (user) {
      setLiked(Boolean(likedByMe));
    } else {
      try {
        setLiked(localStorage.getItem(KEY(id)) === '1');
      } catch {
        /* ignore */
      }
    }
  }, [id, user, likedByMe]);

  async function toggle() {
    if (pending) return;
    const next = !liked;
    const prevCount = count;

    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    setError(false);
    setPending(true);

    try {
      if (!user) {
        if (next) localStorage.setItem(KEY(id), '1');
        else localStorage.removeItem(KEY(id));
      }

      const res = await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: next ? 'like' : 'unlike' }),
      });
      if (!res.ok) throw new Error('failed');
      const data = (await res.json()) as { likeCount: number; liked?: boolean };
      setCount(data.likeCount); // authoritative value from server
      if (user && typeof data.liked === 'boolean') {
        setLiked(data.liked);
      }
    } catch {
      // rollback
      setLiked(!next);
      setCount(prevCount);
      try {
        if (!user) {
          if (next) localStorage.removeItem(KEY(id));
          else localStorage.setItem(KEY(id), '1');
        }
      } catch {
        /* ignore */
      }
      setError(true);
    } finally {
      setPending(false);
    }
  }

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={liked}
        aria-label={liked ? '取消点赞' : '点赞'}
        className={`group inline-flex items-center justify-center rounded-full p-2 transition-colors duration-200 cursor-pointer
          ${liked ? 'text-brand hover:bg-brand/10' : 'text-ink-subtle hover:bg-surface-muted hover:text-brand'}`}
      >
        <Heart
          className={`${iconSize} transition-transform duration-200 active:scale-90
            ${liked ? 'fill-brand text-brand animate-like-pop' : ''}`}
        />
      </button>
      <span
        className={`tabular-nums text-sm min-w-[1.5rem] text-ink-muted ${
          error ? 'text-brand-dark' : ''
        }`}
        title={error ? '操作失败，请重试' : undefined}
      >
        {count}
      </span>
    </div>
  );
}
