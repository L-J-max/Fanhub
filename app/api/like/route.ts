import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import type { LikeResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }

  const { id, action } = (body ?? {}) as {
    id?: unknown;
    action?: unknown;
  };

  if (typeof id !== 'string' || (action !== 'like' && action !== 'unlike')) {
    return NextResponse.json({ error: '参数无效' }, { status: 400 });
  }

  const user = await getUserFromRequest(req);
  const db = getDb();

  // Guard: content must exist.
  const existsResult = await db.execute({
    sql: 'SELECT 1 FROM content WHERE id = ?',
    args: [id],
  });
  if ((existsResult.rows as unknown[]).length === 0) {
    return NextResponse.json({ error: '内容不存在' }, { status: 404 });
  }

  let liked = action === 'like';

  if (user) {
    const uid = user.username;
    // Logged-in: dedupe via the likes table so each user counts once.
    const alreadyResult = await db.execute({
      sql: 'SELECT 1 FROM likes WHERE user_id = ? AND content_id = ?',
      args: [uid, id],
    });
    const already = (alreadyResult.rows as unknown[]).length > 0;
    if (action === 'like') {
      if (!already) {
        await db.execute({
          sql: "INSERT INTO likes (user_id, content_id, created_at) VALUES (?, ?, datetime('now'))",
          args: [uid, id],
        });
        await db.execute({
          sql: 'UPDATE content SET like_count = like_count + 1 WHERE id = ?',
          args: [id],
        });
      }
      liked = true;
    } else {
      if (already) {
        await db.execute({
          sql: 'DELETE FROM likes WHERE user_id = ? AND content_id = ?',
          args: [uid, id],
        });
        await db.execute({
          sql: 'UPDATE content SET like_count = MAX(0, like_count - 1) WHERE id = ?',
          args: [id],
        });
      }
      liked = false;
    }
  } else {
    // Anonymous: simple count increment/decrement (device dedup handled client-side).
    const delta = action === 'like' ? 1 : -1;
    await db.execute({
      sql: 'UPDATE content SET like_count = MAX(0, like_count + ?) WHERE id = ?',
      args: [delta, id],
    });
  }

  const rowResult = await db.execute({
    sql: 'SELECT like_count FROM content WHERE id = ?',
    args: [id],
  });
  const row = (rowResult.rows as unknown as { like_count: number }[])[0];

  const resp: LikeResponse & { liked?: boolean } = {
    likeCount: row.like_count,
    liked,
  };
  return NextResponse.json(resp);
}
