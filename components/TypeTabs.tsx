'use client';

import type { ContentType } from '@/lib/types';

const TABS: { value: ContentType | null; label: string }[] = [
  { value: null, label: '全部' },
  { value: 'video', label: '视频' },
  { value: 'text', label: '文本' },
  { value: 'audio', label: '音频' },
  { value: 'image', label: '图片' },
];

export default function TypeTabs({
  value,
  onChange,
}: {
  value: ContentType | null;
  onChange: (v: ContentType | null) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="内容类型筛选"
      className="inline-flex flex-wrap gap-1 rounded-full bg-surface-muted p-1 border border-surface-border"
    >
      {TABS.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.label}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 cursor-pointer
              ${
                active
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
