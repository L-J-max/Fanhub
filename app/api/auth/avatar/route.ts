import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import {
  getDb,
  AVATAR_DIR,
} from '@/lib/db';
import {
  getUserFromRequest,
  ALLOWED_AVATAR_MIME,
  MAX_AVATAR_SIZE,
  saveAvatar,
  resolveAvatarPath,
  avatarUrl,
} from '@/lib/auth';
import fs from 'node:fs';

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
  // Remove the previous avatar file (if any) before writing the new one.
  const prev = db
    .prepare('SELECT avatar FROM users WHERE username = ?')
    .get(user.username) as { avatar: string | null } | undefined;
  if (prev?.avatar) {
    const oldPath = resolveAvatarPath(prev.avatar);
    if (oldPath) {
      try {
        fs.unlinkSync(oldPath);
      } catch {
        /* already missing — ignore */
      }
    }
  }

  const id = nanoid();
  const stored = saveAvatar(id, ext, buffer);
  db.prepare('UPDATE users SET avatar = ? WHERE username = ?').run(
    stored,
    user.username
  );

  return NextResponse.json({ ok: true, avatarUrl: avatarUrl(stored) });
}
