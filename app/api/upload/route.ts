import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/db';
import {
  isValidType,
  isValidTitle,
  getExtensionForMime,
  MAX_SIZE,
} from '@/lib/validation';
import { saveUploadFile } from '@/lib/upload';
import { getUserFromRequest } from '@/lib/auth';
import type { ContentType } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UploadBody {
  type?: unknown;
  title?: unknown;
  text?: unknown;
  file?: unknown; // { data: string (base64), mime: string }
}

export async function POST(req: NextRequest) {
  // Publishing requires a logged-in account so content can be attributed and
  // surfaced under the author's "我的 / 作品" page.
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: '请先登录后再发布内容' }, { status: 401 });
  }

  let body: UploadBody;
  try {
    body = (await req.json()) as UploadBody;
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }

  const { type: typeRaw, title: titleRaw, text: textRaw, file: fileRaw } = body;

  if (!isValidType(typeRaw)) {
    return NextResponse.json({ error: '无效的内容类型' }, { status: 400 });
  }
  const type = typeRaw as ContentType;

  if (!isValidTitle(titleRaw)) {
    return NextResponse.json(
      { error: `标题必填且不超过 200 字` },
      { status: 400 }
    );
  }
  const title = titleRaw as string;

  const id = nanoid();
  let storedName: string | null = null;
  let mime: string | null = null;
  let size: number | null = null;

  if (type === 'text') {
    if (typeof textRaw !== 'string' || textRaw.trim().length === 0) {
      return NextResponse.json({ error: '文本内容不能为空' }, { status: 400 });
    }
    if (textRaw.length > MAX_SIZE.text) {
      return NextResponse.json(
        { error: `文本长度不超过 ${MAX_SIZE.text / 1024} KB` },
        { status: 400 }
      );
    }
  } else {
    // media types: expect { data: base64, mime }
    if (
      !fileRaw ||
      typeof fileRaw !== 'object' ||
      typeof (fileRaw as { data?: unknown }).data !== 'string' ||
      typeof (fileRaw as { mime?: unknown }).mime !== 'string'
    ) {
      return NextResponse.json({ error: '请选择要上传的文件' }, { status: 400 });
    }
    const f = fileRaw as { data: string; mime: string };
    let buffer: Buffer;
    try {
      buffer = Buffer.from(f.data, 'base64');
    } catch {
      return NextResponse.json({ error: '文件数据无效' }, { status: 400 });
    }
    const normalizedMime = f.mime.toLowerCase().split(';')[0].trim();
    const ext = getExtensionForMime(type, normalizedMime);
    if (!ext) {
      return NextResponse.json(
        { error: `不支持的文件格式：${f.mime || '未知'}` },
        { status: 400 }
      );
    }
    if (buffer.length === 0) {
      return NextResponse.json({ error: '文件为空' }, { status: 400 });
    }
    if (buffer.length > MAX_SIZE[type]) {
      const mb = Math.round(MAX_SIZE[type] / (1024 * 1024));
      return NextResponse.json({ error: `文件超过 ${mb} MB 上限` }, { status: 400 });
    }
    storedName = await saveUploadFile(id, ext, buffer);
    mime = normalizedMime;
    size = buffer.length;
  }

  const db = getDb();
  db.prepare(
    `INSERT INTO content (id, type, title, text_body, file_path, mime, size, like_count, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(
    id,
    type,
    title.trim(),
    type === 'text' ? (textRaw as string) : null,
    storedName,
    mime,
    size,
    user.username
  );

  return NextResponse.json({ id, type, title: title.trim() }, { status: 201 });
}
