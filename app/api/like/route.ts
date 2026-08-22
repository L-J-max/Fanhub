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
  const exists = db.prepare('SELECT 1 FROM content WHERE id = ?').get(id);
  if (!exists) {
    return NextResponse.json({ error: '内容不存在' }, { status: 404 });
  }

  let liked = action === 'like';

  if (user) {
    const uid = user.username;
    // Logged-in: dedupe via the likes table so each user counts once.
    const already = db
      .prepare('SELECT 1 FROM likes WHERE user_id = ? AND content_id = ?')
      .get(uid, id);
    if (action === 'like') {
      if (!already) {
        db.prepare(
          'INSERT INTO likes (user_id, content_id, created_at) VALUES (?, ?, datetime(\'now\'))'
        ).run(uid, id);
        db.prepare('UPDATE content SET like_count = like_count + 1 WHERE id = ?').run(id);
      }
      liked = true;
    } else {
      if (already) {
        db.prepare('DELETE FROM likes WHERE user_id = ? AND content_id = ?').run(uid, id);
        db.prepare('UPDATE content SET like_count = MAX(0, like_count - 1) WHERE id = ?').run(id);
      }
      liked = false;
    }
  } else {
    // Anonymous: simple count increment/decrement (device dedup handled client-side).
    const delta = action === 'like' ? 1 : -1;
    db.prepare(
      'UPDATE content SET like_count = MAX(0, like_count + ?) WHERE id = ?'
    ).run(delta, id);
  }

  const row = db
    .prepare(`SELECT like_count FROM content WHERE id = ?`)
    .get(id) as unknown as { like_count: number };

  const resp: LikeResponse & { liked?: boolean } = {
    likeCount: row.like_count,
    liked,
  };
  return NextResponse.json(resp);
}
