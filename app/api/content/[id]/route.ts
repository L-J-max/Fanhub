import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { deleteBlobByUrl } from '@/lib/upload';
import { getUserFromRequest, isAdmin } from '@/lib/auth';
import { isValidTitle } from '@/lib/validation';
import type { ApiContentDetail, ContentItem } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getDb().execute({
    sql: 'SELECT * FROM content WHERE id = ?',
    args: [id],
  });
  const row = (result.rows as unknown as ContentItem[])[0];

  if (!row) {
    return NextResponse.json({ error: '内容不存在' }, { status: 404 });
  }

  const detail: ApiContentDetail = {
    id: row.id,
    type: row.type,
    title: row.title,
    text_body: row.type === 'text' ? row.text_body : null,
    fileUrl: row.type !== 'text' && row.file_path ? row.file_path : null,
    mime: row.mime,
    size: row.size,
    like_count: row.like_count,
    created_at: row.created_at,
  };

  return NextResponse.json(detail);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const rowResult = await db.execute({
    sql: 'SELECT file_path, user_id FROM content WHERE id = ?',
    args: [id],
  });
  const row = (rowResult.rows as unknown as { file_path: string | null; user_id: string | null }[])[0];

  if (!row) {
    return NextResponse.json({ error: '内容不存在' }, { status: 404 });
  }

  // Ownership: a logged-in user may only delete their own content. The admin
  // role bypasses this (highest privilege). Legacy uploads remain deletable.
  const user = await getUserFromRequest(req);
  const admin = isAdmin(user);
  if (row.user_id && !admin && (!user || user.username !== row.user_id)) {
    return NextResponse.json({ error: '无权删除该内容' }, { status: 403 });
  }

  // Remove the media from Blob storage (best-effort).
  await deleteBlobByUrl(row.file_path);

  await db.execute({ sql: 'DELETE FROM content WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const rowResult = await db.execute({
    sql: 'SELECT id, user_id, type FROM content WHERE id = ?',
    args: [id],
  });
  const row = (rowResult.rows as unknown as { id: string; user_id: string | null; type: string }[])[0];

  if (!row) {
    return NextResponse.json({ error: '内容不存在' }, { status: 404 });
  }

  // Editing is permitted for the author or any administrator.
  const user = await getUserFromRequest(req);
  const admin = isAdmin(user);
  if (!user || (!admin && user.username !== row.user_id)) {
    return NextResponse.json({ error: '无权编辑该内容' }, { status: 403 });
  }

  let body: { title?: unknown; text?: unknown };
  try {
    body = (await req.json()) as { title?: unknown; text?: unknown };
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }

  if (!isValidTitle(body.title)) {
    return NextResponse.json({ error: '标题必填且不超过 200 字' }, { status: 400 });
  }
  const title = String(body.title).trim();

  // Only text content carries an editable body.
  const text =
    row.type === 'text' && typeof body.text === 'string' ? body.text : undefined;

  if (text !== undefined) {
    await db.execute({
      sql: 'UPDATE content SET title = ?, text_body = ? WHERE id = ?',
      args: [title, text, id],
    });
  } else {
    await db.execute({
      sql: 'UPDATE content SET title = ? WHERE id = ?',
      args: [title, id],
    });
  }

  const updatedResult = await db.execute({
    sql: 'SELECT title FROM content WHERE id = ?',
    args: [id],
  });
  const updated = (updatedResult.rows as unknown as { title: string }[])[0];
  return NextResponse.json({ ok: true, id, title: updated.title });
}
