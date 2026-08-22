import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isValidType, SNIPPET_LENGTH } from '@/lib/validation';
import { getUserFromRequest } from '@/lib/auth';
import type { ApiContent, ContentListResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const typeParam = searchParams.get('type');
  const type = isValidType(typeParam) ? typeParam : null;
  const author = searchParams.get('author');
  const likedBy = searchParams.get('likedBy');
  const me = await getUserFromRequest(req);

  const limit = Math.min(
    Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1),
    100
  );
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

  const where: string[] = [];
  const params: unknown[] = [SNIPPET_LENGTH];

  const meName = me?.username ?? null;

  // Extra columns for the current viewer (only meaningful when logged in).
  const extraCols = `(CASE WHEN ? IS NOT NULL AND c.user_id = ? THEN 1 ELSE 0 END) AS mine,
    (CASE WHEN ? IS NOT NULL THEN (SELECT 1 FROM likes l WHERE l.content_id = c.id AND l.user_id = ?) ELSE 0 END) AS likedByMe`;
  params.push(meName ?? '', meName ?? '', meName ?? '', meName ?? '');

  if (type) {
    where.push('c.type = ?');
    params.push(type);
  }
  if (author) {
    where.push('c.user_id = ?');
    params.push(author);
  }
  if (likedBy) {
    where.push('c.id IN (SELECT content_id FROM likes WHERE user_id = ?)');
    params.push(likedBy);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.id, c.type, c.title,
         CASE WHEN c.type='text' THEN substr(c.text_body,1,?) ELSE NULL END AS snippet,
         c.mime, c.size, c.like_count, c.created_at,
         ${extraCols}
       FROM content c
       ${whereSql}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...(params as []), limit, offset) as unknown as ApiContent[];

  // Count uses the same filter (without the extra viewer columns).
  const countParams: unknown[] = [];
  const countWhere: string[] = [];
  if (type) {
    countWhere.push('type = ?');
    countParams.push(type);
  }
  if (author) {
    countWhere.push('user_id = ?');
    countParams.push(author);
  }
  if (likedBy) {
    countWhere.push('id IN (SELECT content_id FROM likes WHERE user_id = ?)');
    countParams.push(likedBy);
  }
  const countWhereSql = countWhere.length ? `WHERE ${countWhere.join(' AND ')}` : '';
  const countRow = db
    .prepare(`SELECT COUNT(*) AS c FROM content ${countWhereSql}`)
    .get(...(countParams as [])) as { c: number };

  const nextOffset = offset + limit < countRow.c ? offset + limit : null;

  const body: ContentListResponse = { items: rows, nextOffset };
  return NextResponse.json(body);
}
