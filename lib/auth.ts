import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, AVATAR_DIR, getDb } from './db';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';

const SECRET_PATH = path.join(DATA_DIR, '.secret');
const COOKIE_NAME = 'fanhub_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Built-in administrator account. */
export const ADMIN_USERNAME = '888';
export const ADMIN_PASSWORD = '88888888';
export const ADMIN_ROLE = 'admin';
export const USER_ROLE = 'user';

export interface SessionUser {
  username: string;
  role: string;
}

export function isAdmin(user: SessionUser | null): boolean {
  return !!user && user.role === ADMIN_ROLE;
}

// ---------------------------------------------------------------------------
// Session signing secret — generated once and persisted next to the database.
// ---------------------------------------------------------------------------
function getSecret(): string {
  try {
    if (fs.existsSync(SECRET_PATH)) {
      const s = fs.readFileSync(SECRET_PATH, 'utf8').trim();
      if (s) return s;
    }
  } catch {
    /* fall through to (re)create */
  }
  const secret = crypto.randomBytes(32).toString('hex');
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SECRET_PATH, secret, { mode: 0o600 });
  } catch {
    /* non-fatal: a fresh secret is used for this process only */
  }
  return secret;
}

// ---------------------------------------------------------------------------
// Password hashing (scrypt, salted)
// ---------------------------------------------------------------------------
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const salt = Buffer.from(parts[0], 'hex');
  const key = Buffer.from(parts[1], 'hex');
  if (salt.length !== 16 || key.length !== 64) return false;
  const check = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(key, check);
}

// ---------------------------------------------------------------------------
// Signed session token: base64url(payload).hmac
//   payload = `${username}.${expiryEpochMs}`
// Verifying checks the HMAC and expiry, returning the username or null.
// ---------------------------------------------------------------------------
function sign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function createSessionToken(username: string): string {
  const payload = `${username}.${Date.now() + SESSION_MAX_AGE * 1000}`;
  const b64 = Buffer.from(payload).toString('base64url');
  return `${b64}.${sign(b64)}`;
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const b64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(b64);
  // constant-time compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = Buffer.from(b64, 'base64url').toString('utf8');
    const sep = payload.lastIndexOf('.');
    if (sep < 0) return null;
    const username = payload.slice(0, sep);
    const expiry = Number(payload.slice(sep + 1));
    if (!username || Number.isNaN(expiry) || Date.now() > expiry) return null;
    return username;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------
function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}

export function setSession(res: NextResponse, username: string): void {
  res.cookies.set(COOKIE_NAME, createSessionToken(username), cookieOptions());
}

export function clearSession(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, '', { ...cookieOptions(), maxAge: 0 });
}

/**
 * Ensures the built-in administrator account exists. Safe to call on every
 * boot — it only inserts when the row is absent. The password is fixed and
 * cannot be changed through the UI (admin-only setup).
 */
export function ensureAdmin(): void {
  try {
    const db = getDb();
    const existing = db
      .prepare('SELECT username FROM users WHERE username = ?')
      .get(ADMIN_USERNAME) as { username: string } | undefined;
    if (existing) return;
    db.prepare(
      "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, datetime('now'))"
    ).run(ADMIN_USERNAME, hashPassword(ADMIN_PASSWORD), ADMIN_ROLE);
  } catch {
    /* best-effort; the server still runs if seeding fails */
  }
}

function lookupUser(username: string | null): SessionUser | null {
  if (!username) return null;
  try {
    const db = getDb();
    const row = db
      .prepare('SELECT username, role FROM users WHERE username = ?')
      .get(username) as { username: string; role: string } | undefined;
    if (!row) return null;
    return { username: row.username, role: row.role || USER_ROLE };
  } catch {
    return null;
  }
}

/** For route handlers that receive a NextRequest. */
export async function getUserFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const username = verifySessionToken(req.cookies.get(COOKIE_NAME)?.value);
  return lookupUser(username);
}

/** For server components / pages using next/headers cookies(). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const username = verifySessionToken(store.get(COOKIE_NAME)?.value);
  return lookupUser(username);
}

export const SESSION_COOKIE = COOKIE_NAME;

// ---------------------------------------------------------------------------
// Avatar persistence — uploaded avatars live in DATA_DIR/avatars, keyed by a
// random id + extension. The DB stores only the stored filename; the UI gets a
// URL (/api/file/avatar/<name>). Old avatars are deleted when replaced.
// ---------------------------------------------------------------------------
export const ALLOWED_AVATAR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

/** Writes avatar bytes and returns the stored filename, or null on rejection. */
export function saveAvatar(id: string, ext: string, data: Uint8Array): string {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
  const name = `${id}.${ext}`;
  fs.writeFileSync(path.join(AVATAR_DIR, name), data);
  return name;
}

/** Resolves an avatar filename to an absolute path, guarding path traversal. */
export function resolveAvatarPath(name: string): string | null {
  const base = path.resolve(AVATAR_DIR);
  const resolved = path.resolve(AVATAR_DIR, name);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) return null;
  return resolved;
}

/** Builds the public URL for a stored avatar filename (null-safe). */
export function avatarUrl(name: string | null): string | null {
  return name ? `/api/file/avatar/${name}` : null;
}

export const AVATAR_FILE_PREFIX = '/api/file/avatar/';
