import { NextRequest, NextResponse } from 'next/server';
import { getHeroImage } from '@/lib/hero';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Hero images are now stored in Vercel Blob; the database holds the public URL.
// This endpoint simply 302-redirects to that URL so existing references keep
// working. Front-end components already use the `url` field directly.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const row = await getHeroImage(id);
  if (!row || !row.url) {
    return new NextResponse('Not Found', { status: 404 });
  }
  return NextResponse.redirect(row.url, 302);
}
