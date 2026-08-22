import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatDate, formatSize, TYPE_LABEL } from '@/lib/format';
import MediaPlayer from '@/components/MediaPlayer';
import LikeButton from '@/components/LikeButton';
import DeleteButton from '@/components/DeleteButton';
import { TypeIcon } from '@/components/TypeIcon';
import type { ContentItem } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rowResult = await getDb().execute({
    sql: 'SELECT * FROM content WHERE id = ?',
    args: [id],
  });
  const row = (rowResult.rows as unknown as ContentItem[])[0];

  if (!row) notFound();

  // Only the author (or any admin) may delete / edit. Legacy anon uploads
  // (user_id IS NULL) are editable by anyone.
  const me = await getCurrentUser();
  const admin = me?.role === 'admin';
  const mine = admin || (row.user_id ? me?.username === row.user_id : true);

  let likedByMe = false;
  if (me) {
    const likedResult = await getDb().execute({
      sql: 'SELECT 1 FROM likes WHERE user_id = ? AND content_id = ?',
      args: [me.username, id],
    });
    likedByMe = (likedResult.rows as unknown[]).length > 0;
  }

  // file_path now stores the full Blob URL for media items.
  const fileUrl =
    row.type !== 'text' && row.file_path ? row.file_path : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors duration-200 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        返回列表
      </Link>

      <header className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium bg-surface-muted px-2.5 py-1 rounded-full text-ink-muted">
          <TypeIcon type={row.type} className="w-3.5 h-3.5" />
          {TYPE_LABEL[row.type]}
        </div>
        <h1 className="text-2xl font-bold text-ink">{row.title}</h1>
        <div className="text-sm text-ink-subtle flex items-center gap-2">
          <span>{formatDate(row.created_at)}</span>
          {row.size ? <span>· {formatSize(row.size)}</span> : null}
        </div>
      </header>

      <MediaPlayer type={row.type} fileUrl={fileUrl} textBody={row.text_body} />

      <div className="flex items-center justify-between border-t border-surface-border pt-4">
        <span className="text-sm text-ink-subtle">觉得不错就点个赞</span>
        <div className="flex items-center gap-2">
          {mine ? (
            <>
              <Link
                href={`/content/${row.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-full border border-surface-border px-4 py-2 text-sm font-medium text-ink-muted transition-colors duration-200 hover:text-accent hover:border-accent/40 cursor-pointer"
              >
                编辑
              </Link>
              <DeleteButton id={row.id} label="删除内容" />
            </>
          ) : null}
          <LikeButton id={row.id} initialCount={row.like_count} likedByMe={likedByMe} />
        </div>
      </div>
    </div>
  );
}
