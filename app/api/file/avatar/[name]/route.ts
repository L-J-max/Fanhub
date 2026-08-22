import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import { resolveAvatarPath } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Serve a stored avatar image by its filename. Path traversal is blocked by
// resolveAvatarPath (only files inside AVATAR_DIR are reachable). Supports
// HTTP Range so browsers can stream; returns 206 when partial.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  // Guard against empty / sneaky names.
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) {
    return NextResponse.json({ error: '无效的文件名' }, { status: 400 });
  }

  const abs = resolveAvatarPath(name);
  if (!abs || !fs.existsSync(abs)) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }

  const stat = fs.statSync(abs);
  const mime = name.endsWith('.png')
    ? 'image/png'
    : name.endsWith('.webp')
    ? 'image/webp'
    : name.endsWith('.gif')
    ? 'image/gif'
    : 'image/jpeg';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const range = (_req.headers as any).get?.('range') as string | undefined;
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    let start = 0;
    let end = stat.size - 1;
    if (match) {
      if (match[1]) start = parseInt(match[1], 10);
      if (match[2]) end = parseInt(match[2], 10);
    }
    if (start > end || end >= stat.size) {
      return new NextResponse(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${stat.size}` },
      });
    }
    const chunk = fs.readFileSync(abs).subarray(start, end + 1);
    return new NextResponse(chunk, {
      status: 206,
      headers: {
        'Content-Type': mime,
        'Content-Length': String(chunk.length),
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  const data = fs.readFileSync(abs);
  return new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Length': String(stat.size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
