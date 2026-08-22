'use client';

import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { TypeIcon } from './TypeIcon';
import LikeButton from './LikeButton';
import DeleteButton from './DeleteButton';
import { useAuth } from './AuthProvider';
import { formatDate, formatSize, TYPE_LABEL } from '@/lib/format';
import type { ApiContent } from '@/lib/types';

export default function ContentCard({
  item,
  onDelete,
}: {
  item: ApiContent;
  onDelete?: (id: string) => void;
}) {
  const { user, isAdmin } = useAuth();
  const canManage = Boolean(item.mine) || (isAdmin && !!user);

  const isImage = item.type === 'image';
  // fileUrl is the full Blob URL; fall back gracefully if absent.
  const thumbUrl = isImage && item.fileUrl ? item.fileUrl : null;

  return (
    <article className="group relative flex flex-col rounded-2xl bg-surface border border-surface-border shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-hidden animate-fade-in">
      {canManage ? (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
          <Link
            href={`/content/${item.id}/edit`}
            title="编辑内容"
            aria-label="编辑内容"
            className="inline-flex items-center justify-center rounded-full p-2 text-ink-muted bg-surface/80 backdrop-blur transition-colors duration-200 hover:text-accent hover:bg-surface cursor-pointer"
          >
            <Pencil className="w-4 h-4" aria-hidden />
          </Link>
          <DeleteButton id={item.id} onDeleted={() => onDelete?.(item.id)} variant="icon" />
        </div>
      ) : null}

      <Link href={`/content/${item.id}`} className="flex flex-col flex-1 cursor-pointer">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt=""
            loading="lazy"
            className="h-44 w-full object-cover"
          />
        ) : null}

        <div className="flex items-center gap-2 px-4 pt-4 text-ink-muted">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-surface-muted px-2 py-1 rounded-full">
            <TypeIcon type={item.type} className="w-3.5 h-3.5" />
            {TYPE_LABEL[item.type]}
          </span>
        </div>

        <div className="px-4 py-3 flex-1">
          <h3 className="font-semibold text-ink line-clamp-2 group-hover:text-accent transition-colors duration-200">
            {item.title}
          </h3>
          {item.snippet ? (
            <p className="mt-1.5 text-sm text-ink-muted line-clamp-3 whitespace-pre-wrap">
              {item.snippet}
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-ink-subtle">
              {TYPE_LABEL[item.type]}内容 · 点击查看
            </p>
          )}
        </div>

        <div className="px-4 pb-3 text-xs text-ink-subtle flex items-center gap-2">
          <span>{formatDate(item.created_at)}</span>
          {item.size ? <span>· {formatSize(item.size)}</span> : null}
        </div>
      </Link>

      <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
        <span className="text-xs text-ink-subtle">{TYPE_LABEL[item.type]}</span>
        <LikeButton
          id={item.id}
          initialCount={item.like_count}
          size="sm"
          likedByMe={item.likedByMe}
        />
      </div>
    </article>
  );
}
