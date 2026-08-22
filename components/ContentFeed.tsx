'use client';

import { useCallback, useEffect, useState } from 'react';
import TypeTabs from './TypeTabs';
import ContentCard from './ContentCard';
import type { ApiContent, ContentListResponse, ContentType } from '@/lib/types';

const PAGE = 12;

export default function ContentFeed({
  author,
  likedBy,
  showTabs = true,
  emptyHint = '还没有内容，去上传第一条吧。',
}: {
  author?: string;
  likedBy?: string;
  showTabs?: boolean;
  emptyHint?: string;
}) {
  const [type, setType] = useState<ContentType | null>(null);
  const [items, setItems] = useState<ApiContent[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (t: ContentType | null, offset: number, append: boolean) => {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
        if (t) params.set('type', t);
        if (author) params.set('author', author);
        if (likedBy) params.set('likedBy', likedBy);
        const res = await fetch(`/api/content?${params.toString()}`);
        if (!res.ok) throw new Error('load failed');
        const data = (await res.json()) as ContentListResponse;
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setNextOffset(data.nextOffset);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [author, likedBy]
  );

  // Reload when filter changes.
  useEffect(() => {
    load(type, 0, false);
  }, [type, load]);

  const loadMore = () => {
    if (nextOffset == null) return;
    load(type, nextOffset, true);
  };

  // Optimistic removal: drop the card immediately, roll back to the previous
  // list if the server rejects the deletion.
  const handleDelete = (id: string) => {
    setItems((prev) => {
      const backup = prev;
      const next = prev.filter((it) => it.id !== id);
      if (next.length === backup.length) return backup;
      fetch(`/api/content/${id}`, { method: 'DELETE' })
        .then((r) => {
          if (!r.ok) throw new Error('delete failed');
        })
        .catch(() => setItems(backup));
      return next;
    });
    setNextOffset((o) => (o == null ? o : Math.max(o - 1, 0)));
  };

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        {showTabs ? (
          <h2 className="text-lg font-semibold text-ink">最新内容</h2>
        ) : null}
        {showTabs ? <TypeTabs value={type} onChange={setType} /> : null}
      </div>

      {error ? (
        <div className="text-center py-16 text-ink-muted">
          加载失败，请稍后重试。
        </div>
      ) : loading && items.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-surface-muted animate-pulse border border-surface-border"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-ink-muted">{emptyHint}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <ContentCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
          {nextOffset != null ? (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                className="px-5 py-2 rounded-full border border-surface-border text-ink-muted hover:text-ink hover:border-ink-subtle transition-colors duration-200 cursor-pointer"
              >
                加载更多
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
