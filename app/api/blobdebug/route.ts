import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/db';
import { getExtensionForMime } from '@/lib/validation';
import { saveBlob } from '@/lib/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const out: any = { hasToken: !!process.env.BLOB_READ_WRITE_TOKEN };
  try {
    const data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
    const buffer = Buffer.from(data, 'base64');
    out.bufferLen = buffer.length;
    const mime = 'image/png';
    const ext = getExtensionForMime('image', mime);
    out.ext = ext;
    if (!ext) { out.step = 'ext-null'; return NextResponse.json(out); }
    const id = nanoid();
    const storedName = await saveBlob('uploads/' + id + '.' + ext, buffer, mime);
    out.storedName = storedName;
    const db = getDb();
    await db.execute({
      sql: 'INSERT INTO content (id,type,title,text_body,file_path,mime,size,like_count,user_id) VALUES (?,?,?,?,?,?,?,0,?)',
      args: [id, 'image', 'debug', null, storedName, mime, buffer.length, 'debuguser'],
    });
    out.step = 'ok'; out.id = id;
  } catch (e: any) {
    out.step = 'error'; out.name = e?.name; out.message = e?.message;
    out.stack = (e?.stack || '').split('\n').slice(0, 6);
  }
  return NextResponse.json(out);
}
