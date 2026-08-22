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
  // Pull the stored avatar URL (now a full Blob URL).
  const rowResult = await getDb().execute({
    sql: 'SELECT avatar FROM users WHERE username = ?',
    args: [user.username],
  });
  const row = (rowResult.rows as unknown as { avatar: string | null }[])[0];
  return NextResponse.json({
    user: {
      username: user.username,
      role: user.role,
      avatarUrl: avatarUrl(row?.avatar ?? null),
    },
  });
}
