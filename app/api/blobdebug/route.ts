import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN || '';
  const out: any = { hasToken: !!token, prefix: token.slice(0, 20) };
  try {
    const b = await put('debug/probe2.txt', Buffer.from('probe2'), {
      access: 'public', token, allowOverwrite: true,
    });
    out.step = 'ok'; out.url = b.url;
  } catch (e: any) {
    out.step = 'error'; out.name = e?.name; out.message = e?.message;
  }
  return NextResponse.json(out);
}
