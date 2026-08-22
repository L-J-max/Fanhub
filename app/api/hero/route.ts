import { NextResponse } from 'next/server';
import { getHeroSlides } from '@/lib/hero';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ slides: await getHeroSlides() });
}
