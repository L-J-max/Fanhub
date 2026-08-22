import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest, avatarUrl } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ user: null });
  }
  // Pull the stored avatar filename to build a public URL.
  const row = getDb()
    .prepare('SELECT avatar FROM users WHERE username = ?')
    .get(user.username) as { avatar: string | null } | undefined;
  return NextResponse.json({
    user: {
      username: user.username,
      role: user.role,
      avatarUrl: avatarUrl(row?.avatar ?? null),
    },
  });
}
