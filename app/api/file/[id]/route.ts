import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { Readable } from 'node:stream';
import { getDb } from '@/lib/db';
import { resolveUploadPath } from '@/lib/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const row = getDb()
    .prepare('SELECT file_path, mime, type FROM content WHERE id = ?')
    .get(id) as
    | unknown as { file_path: string | null; mime: string | null; type: string }
    | undefined;


  if (!row || !row.file_path || row.type === 'text') {
    return new NextResponse('Not Found', { status: 404 });
  }

  const abs = resolveUploadPath(row.file_path);
  if (!abs) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  let total: number;
  try {
    total = (await fsp.stat(abs)).size;
  } catch {
    return new NextResponse('Not Found', { status: 404 });
  }

  const mime = row.mime || 'application/octet-stream';
  const headers: Record<string, string> = {
    'Content-Type': mime,
    'X-Content-Type-Options': 'nosniff',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=3600',
  };

  const range = req.headers.get('range');
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match && match[1] ? parseInt(match[1], 10) : 0;
    const end = match && match[2] ? parseInt(match[2], 10) : total - 1;

    if (isNaN(start) || isNaN(end) || start > end || end >= total) {
      return new NextResponse('Range Not Satisfiable', {
        status: 416,
        headers: { 'Content-Range': `bytes */${total}` },
      });
    }

    const chunkSize = end - start + 1;
    headers['Content-Range'] = `bytes ${start}-${end}/${total}`;
    headers['Content-Length'] = String(chunkSize);

    const stream = Readable.toWeb(
      fs.createReadStream(abs, { start, end })
    ) as unknown as ReadableStream;
    return new NextResponse(stream, { status: 206, headers });
  }

  headers['Content-Length'] = String(total);
  const stream = Readable.toWeb(fs.createReadStream(abs)) as unknown as ReadableStream;
  return new NextResponse(stream, { status: 200, headers });
}
