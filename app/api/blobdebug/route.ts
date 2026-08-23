import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ step: 'no-token', hasToken: false });
  }
  try {
    const b = await put('debug/probe.txt', Buffer.from('probe'), {
      access: 'public',
      token,
      allowOverwrite: true,
    });
    return NextResponse.json({ step: 'ok', hasToken: true, url: b.url });
  } catch (e: any) {
    return NextResponse.json({
      step: 'error',
      hasToken: true,
      name: e?.name,
      message: e?.message,
      stack: (e?.stack || '').split('\n').slice(0, 5),
    });
  }
}
