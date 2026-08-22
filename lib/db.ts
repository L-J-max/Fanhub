import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = path.join(process.cwd(), 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
export const HERO_DIR = path.join(DATA_DIR, 'hero');
export const AVATAR_DIR = path.join(DATA_DIR, 'avatars');
const DB_PATH = path.join(DATA_DIR, 'app.db');

// Cache the connection across hot reloads / module re-evaluations.
const globalForDb = globalThis as unknown as { __fanHubDb?: DatabaseSync };

function init(): DatabaseSync {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const db = new DatabaseSync(DB_PATH);
  try {
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA busy_timeout = 5000');
    db.exec('PRAGMA foreign_keys = ON');
  } catch {
    // Pragmas are best-effort; continue even if unsupported.
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS content (
      id          TEXT PRIMARY KEY,
      type        TEXT NOT NULL CHECK (type IN ('video','text','audio','image')),
      title       TEXT NOT NULL DEFAULT '未命名',
      text_body   TEXT,
      file_path   TEXT,
      mime        TEXT,
      size        INTEGER,
      like_count  INTEGER NOT NULL DEFAULT 0,
      user_id     TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_content_type_created
      ON content (type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_content_created
      ON content (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_content_user
      ON content (user_id);

    CREATE TABLE IF NOT EXISTS hero (
      id          TEXT PRIMARY KEY,
      slot        INTEGER NOT NULL UNIQUE,
      title       TEXT NOT NULL DEFAULT '',
      subtitle    TEXT NOT NULL DEFAULT '',
      file_path   TEXT NOT NULL,
      mime        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'user',
      avatar      TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS likes (
      user_id     TEXT NOT NULL,
      content_id  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, content_id)
    );
    CREATE INDEX IF NOT EXISTS idx_likes_user
      ON likes (user_id);
    CREATE INDEX IF NOT EXISTS idx_likes_content
      ON likes (content_id);
  `);

  // One-time migration for databases created before the image type / login
  // existed. SQLite cannot ALTER a CHECK constraint, so we rebuild the table
  // with the new schema (image allowed + user_id column) and copy the rows.
  migrateContent(db);

  // Backfill the role column for databases created before the admin role
  // existed. ALTER fails (no-op) once the column is present; swallowed.
  try {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
  } catch {
    /* column already exists */
  }

  // Backfill the avatar column for databases created before avatars existed.
  try {
    db.exec('ALTER TABLE users ADD COLUMN avatar TEXT');
  } catch {
    /* column already exists */
  }

  return db;
}

/**
 * Rebuilds the `content` table to the current schema if an older definition
 * (missing the 'image' type in its CHECK) is detected. Idempotent: skips when
 * the table already allows 'image'.
 */
function migrateContent(db: DatabaseSync): void {
  try {
    const row = db
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='content'")
      .get() as { sql?: string } | undefined;
    if (!row?.sql || row.sql.includes("'image'")) return; // already current

    db.exec(`
      ALTER TABLE content RENAME TO content_old;
      CREATE TABLE content (
        id          TEXT PRIMARY KEY,
        type        TEXT NOT NULL CHECK (type IN ('video','text','audio','image')),
        title       TEXT NOT NULL DEFAULT '未命名',
        text_body   TEXT,
        file_path   TEXT,
        mime        TEXT,
        size        INTEGER,
        like_count  INTEGER NOT NULL DEFAULT 0,
        user_id     TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO content (id, type, title, text_body, file_path, mime, size, like_count, user_id, created_at)
        SELECT id, type, title, text_body, file_path, mime, size, like_count, user_id, created_at
        FROM content_old;
      DROP TABLE content_old;
    `);
  } catch {
    /* best-effort; leave as-is if the rebuild cannot run */
  }
}

export function getDb(): DatabaseSync {
  if (!globalForDb.__fanHubDb) {
    globalForDb.__fanHubDb = init();
  }
  return globalForDb.__fanHubDb;
}
