import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function tryPut(label: string, storeId?: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN || '';
  try {
    const b = await put('debug/probe3.txt', Buffer.from('probe3'), {
      access: 'public', token, allowOverwrite: true, ...(storeId ? { storeId } : {}),
    });
    return { label, storeId: storeId || 'UNSET', ok: true, url: b.url };
  } catch (e: any) {
    return { label, storeId: storeId || 'UNSET', ok: false, name: e?.name, message: e?.message };
  }
}

export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN || '';
  const out: any = {
    tokenLen: token.length,
    tokenPrefix: token.slice(0, 25),
    tokenSuffix: token.slice(-8),
    storeId1: process.env.BLOB_STORE_ID,
    storeId2: process.env.BLOB_STORE_ID2_STORE_ID,
    storeId3: process.env.BLOB_STORE_ID3_STORE_ID,
  };
  out.noStoreId = await tryPut('no-storeId');
  if (process.env.BLOB_STORE_ID3_STORE_ID) {
    out.withStoreId3 = await tryPut('with-storeId3', process.env.BLOB_STORE_ID3_STORE_ID);
  }
  if (process.env.BLOB_STORE_ID) {
    out.withStoreId1 = await tryPut('with-storeId-old', process.env.BLOB_STORE_ID);
  }
  return NextResponse.json(out);
}
