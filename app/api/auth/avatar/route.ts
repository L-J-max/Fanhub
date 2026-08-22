import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  ALLOWED_AVATAR_MIME,
  MAX_AVATAR_SIZE,
  saveAvatar,
  avatarUrl,
  getUserFromRequest,
} from '@/lib/auth';
import { deleteBlobByUrl } from '@/lib/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AvatarBody {
  data?: unknown; // base64 string
  mime?: unknown; // e.g. "image/png"
}

export async function POST(req: NextRequest) {
  // Only authenticated users may set an avatar.
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  let body: AvatarBody;
  try {
    body = (await req.json()) as AvatarBody;
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }

  if (
    typeof body.data !== 'string' ||
    typeof body.mime !== 'string'
  ) {
    return NextResponse.json({ error: '请提供图片数据' }, { status: 400 });
  }

  const normalizedMime = body.mime.toLowerCase().split(';')[0].trim();
  const ext = ALLOWED_AVATAR_MIME[normalizedMime];
  if (!ext) {
    return NextResponse.json(
      { error: `不支持的图片格式：${body.mime || '未知'}` },
      { status: 400 }
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(body.data, 'base64');
  } catch {
    return NextResponse.json({ error: '图片数据无效' }, { status: 400 });
  }
  if (buffer.length === 0) {
    return NextResponse.json({ error: '图片为空' }, { status: 400 });
  }
  if (buffer.length > MAX_AVATAR_SIZE) {
    return NextResponse.json(
      { error: `图片超过 ${MAX_AVATAR_SIZE / (1024 * 1024)} MB 上限` },
      { status: 400 }
    );
  }

  const db = getDb();
  // Remove the previous avatar (Blob URL) before writing the new one.
  const prevResult = await db.execute({
    sql: 'SELECT avatar FROM users WHERE username = ?',
    args: [user.username],
  });
  const prev = (prevResult.rows as unknown as { avatar: string | null }[])[0];
  if (prev?.avatar) {
    await deleteBlobByUrl(prev.avatar);
  }

  const stored = await saveAvatar(buffer, ext);
  await db.execute({
    sql: 'UPDATE users SET avatar = ? WHERE username = ?',
    args: [stored, user.username],
  });

  return NextResponse.json({ ok: true, avatarUrl: avatarUrl(stored) });
}
