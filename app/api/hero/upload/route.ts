import { NextRequest, NextResponse } from 'next/server';
import {
  upsertHeroSlide,
  getHeroImage,
  getHeroExtForMime,
  MAX_HERO_IMAGE_SIZE,
  HERO_SLOT_COUNT,
} from '@/lib/hero';
import { getUserFromRequest, isAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UploadBody {
  slot?: unknown;
  title?: unknown;
  subtitle?: unknown;
  file?: unknown; // { data: string (base64), mime: string }
}

export async function POST(req: NextRequest) {
  // Only administrators may edit the start-page hero images.
  const user = await getUserFromRequest(req);
  if (!isAdmin(user)) {
    return NextResponse.json({ error: '仅管理员可编辑首屏图片' }, { status: 403 });
  }

  let body: UploadBody;
  try {
    body = (await req.json()) as UploadBody;
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }

  const { slot: slotRaw, title: titleRaw, subtitle: subtitleRaw, file: fileRaw } =
    body;

  const slot = typeof slotRaw === 'number' ? slotRaw : Number(slotRaw);
  if (
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot >= HERO_SLOT_COUNT
  ) {
    return NextResponse.json(
      { error: `slot 必须在 0 到 ${HERO_SLOT_COUNT - 1} 之间` },
      { status: 400 }
    );
  }

  if (
    !fileRaw ||
    typeof fileRaw !== 'object' ||
    typeof (fileRaw as { data?: unknown }).data !== 'string' ||
    typeof (fileRaw as { mime?: unknown }).mime !== 'string'
  ) {
    return NextResponse.json({ error: '请提供图片文件' }, { status: 400 });
  }

  const f = fileRaw as { data: string; mime: string };
  let buffer: Buffer;
  try {
    buffer = Buffer.from(f.data, 'base64');
  } catch {
    return NextResponse.json({ error: '图片数据无效' }, { status: 400 });
  }

  const normalizedMime = f.mime.toLowerCase().split(';')[0].trim();
  const ext = getHeroExtForMime(normalizedMime);
  if (!ext) {
    return NextResponse.json(
      { error: `不支持的图片格式：${f.mime || '未知'}` },
      { status: 400 }
    );
  }
  if (buffer.length === 0) {
    return NextResponse.json({ error: '图片为空' }, { status: 400 });
  }
  if (buffer.length > MAX_HERO_IMAGE_SIZE) {
    return NextResponse.json(
      { error: `图片超过 ${MAX_HERO_IMAGE_SIZE / (1024 * 1024)} MB 上限` },
      { status: 400 }
    );
  }

  const title = typeof titleRaw === 'string' ? titleRaw.slice(0, 200) : '';
  const subtitle =
    typeof subtitleRaw === 'string' ? subtitleRaw.slice(0, 200) : '';

  const id = await upsertHeroSlide({
    slot,
    title,
    subtitle,
    data: buffer,
    ext,
    mime: normalizedMime,
  });

  const img = await getHeroImage(id);
  return NextResponse.json(
    { id, slot, title, subtitle, url: img?.url ?? null },
    { status: 201 }
  );
}
