import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
  const buffer = Buffer.from(data, 'base64');
  const out: any = { tokenPrefix: (process.env.BLOB_READ_WRITE_TOKEN || '').slice(0, 25) };

  // Test 1: explicit token, no contentType -> worked before
  try {
    const b1 = await put('debug/t1.txt', Buffer.from('probe'), { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN, allowOverwrite: true });
    out.t1_explicit_token = { ok: true, url: b1.url };
  } catch (e: any) { out.t1_explicit_token = { ok: false, message: e.message }; }

  // Test 2: no token, no contentType -> likely fails
  try {
    const b2 = await put('debug/t2.txt', Buffer.from('probe'), { access: 'public', allowOverwrite: true });
    out.t2_no_token = { ok: true, url: b2.url };
  } catch (e: any) { out.t2_no_token = { ok: false, message: e.message }; }

  // Test 3: no token, with contentType -> same as saveBlob
  try {
    const b3 = await put('debug/t3.txt', buffer, { access: 'public', contentType: 'image/png', allowOverwrite: true });
    out.t3_no_token_contentType = { ok: true, url: b3.url };
  } catch (e: any) { out.t3_no_token_contentType = { ok: false, message: e.message }; }

  // Test 4: explicit token, with contentType -> should work
  try {
    const b4 = await put('debug/t4.txt', buffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN, contentType: 'image/png', allowOverwrite: true });
    out.t4_explicit_token_contentType = { ok: true, url: b4.url };
  } catch (e: any) { out.t4_explicit_token_contentType = { ok: false, message: e.message }; }

  return NextResponse.json(out);
}
