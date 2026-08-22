import crypto from 'node:crypto';
import { getDb } from './db';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { saveBlob, deleteBlobByUrl } from './upload';

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
// Session signing secret. On Vercel there is no writable local filesystem, so
// we derive a stable secret from an env var when present, falling back to an
// in-memory secret (rotated per deployment). For durable sessions across
// serverless instances set SESSION_SECRET in the project env.
// ---------------------------------------------------------------------------
let memoSecret: string | null = null;
function getSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (!memoSecret) memoSecret = crypto.randomBytes(32).toString('hex');
  return memoSecret;
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
 * boot — it only inserts when the row is absent.
 */
export async function ensureAdmin(): Promise<void> {
  try {
    const db = getDb();
    const existing = await db.execute({
      sql: 'SELECT username FROM users WHERE username = ?',
      args: [ADMIN_USERNAME],
    });
    if ((existing.rows as unknown as { username: string }[]).length > 0) return;
    await db.execute({
      sql: "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, datetime('now'))",
      args: [ADMIN_USERNAME, hashPassword(ADMIN_PASSWORD), ADMIN_ROLE],
    });
  } catch {
    /* best-effort; the server still runs if seeding fails */
  }
}

// Turso/libsql returns rows; helper to fetch a single object row.
type Row = Record<string, unknown>;
function firstRow(result: { rows: unknown }): Row | undefined {
  const rows = result.rows as Row[];
  return rows && rows.length ? rows[0] : undefined;
}

async function lookupUser(username: string | null): Promise<SessionUser | null> {
  if (!username) return null;
  try {
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT username, role FROM users WHERE username = ?',
      args: [username],
    });
    const row = firstRow(result);
    if (!row) return null;
    return { username: String(row.username), role: String(row.role || USER_ROLE) };
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
// Avatar persistence — avatars are uploaded to Vercel Blob; the DB stores the
// public URL directly. Old avatars are deleted from Blob when replaced.
// ---------------------------------------------------------------------------
export const ALLOWED_AVATAR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

/** Uploads avatar bytes to Blob, returns the public URL. */
export async function saveAvatar(
  data: Uint8Array,
  ext: string
): Promise<string> {
  const id = nanoid();
  return saveBlob(`avatars/${id}.${ext}`, data, `image/${ext}`);
}

/** Builds the public URL for an avatar (now just the stored URL, null-safe). */
export function avatarUrl(url: string | null): string | null {
  return url || null;
}

export const AVATAR_FILE_PREFIX = '';
