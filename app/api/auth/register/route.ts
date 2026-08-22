import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, setSession, ADMIN_USERNAME } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export async function POST(req: NextRequest) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = (await req.json()) as { username?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: '用户名需为 3-20 位字母、数字或下划线' },
      { status: 400 }
    );
  }
  // The built-in admin account name is reserved — it cannot be self-registered.
  if (username === ADMIN_USERNAME) {
    return NextResponse.json({ error: '该用户名不可注册' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 });
  }

  const db = getDb();
  const exists = db
    .prepare('SELECT 1 FROM users WHERE username = ?')
    .get(username);
  if (exists) {
    return NextResponse.json({ error: '该用户名已被注册' }, { status: 409 });
  }

  db.prepare(
    "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, 'user', datetime('now'))"
  ).run(username, hashPassword(password));

  const res = NextResponse.json(
    { ok: true, user: { username, role: 'user' } },
    { status: 201 }
  );
  setSession(res, username);
  return res;
}
