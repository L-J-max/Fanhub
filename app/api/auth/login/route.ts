import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, setSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UserRow {
  username: string;
  password_hash: string;
  role: string;
}

export async function POST(req: NextRequest) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = (await req.json()) as { username?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || !password) {
    return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 });
  }

  const db = getDb();
  const rowResult = await db.execute({
    sql: 'SELECT username, password_hash, role FROM users WHERE username = ?',
    args: [username],
  });
  const row = (rowResult.rows as unknown as UserRow[])[0];

  if (!row || !verifyPassword(password, row.password_hash)) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  const role = row.role || 'user';
  const res = NextResponse.json({
    ok: true,
    user: { username: row.username, role },
  });
  setSession(res, row.username);
  return res;
}
