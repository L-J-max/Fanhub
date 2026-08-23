import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/db';
import { getExtensionForMime } from '@/lib/validation';
import { saveBlob } from '@/lib/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const out: any = {};
  const id = nanoid();
  const data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
  const buffer = Buffer.from(data, 'base64');
  const mime = 'image/png';
  const ext = getExtensionForMime('image', mime);
  out.id = id; out.ext = ext; out.bufferLen = buffer.length;
  try {
    // exact same call as /api/upload
    const storedName = await saveBlob(`uploads/${id}.${ext}`, buffer, mime);
    out.storedName = storedName;
    out.blobStep = 'ok';
  } catch (e: any) {
    out.blobStep = 'error';
    out.blobError = { name: e?.name, message: e?.message, stack: (e?.stack || '').split('\n').slice(0, 5) };
    return NextResponse.json(out);
  }
  try {
    const db = getDb();
    await db.execute({
      sql: 'INSERT INTO content (id,type,title,text_body,file_path,mime,size,like_count,user_id) VALUES (?,?,?,?,?,?,?,0,?)',
      args: [id, 'image', 'debug', null, out.storedName, mime, buffer.length, 'debuguser'],
    });
    out.dbStep = 'ok';
  } catch (e: any) {
    out.dbStep = 'error';
    out.dbError = { name: e?.name, message: e?.message, stack: (e?.stack || '').split('\n').slice(0, 5) };
  }
  return NextResponse.json(out);
}
