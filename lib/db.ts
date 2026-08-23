import {
  createClient,
  type Client,
  type InStatement,
  type ResultSet,
} from '@libsql/client';

// ---------------------------------------------------------------------------
// Database layer — Turso (libSQL) for Vercel-compatible, persistent storage.
//
// The app was originally built on Node's built-in `node:sqlite`, which writes
// to a local file. That does not work on Vercel's stateless serverless
// functions (the filesystem is read-only / ephemeral). We now use Turso, a
// hosted SQLite-compatible database accessed over HTTP. The SQL surface is
// identical (SQLite syntax, `?` placeholders), so the rest of the app barely
// changes.
//
// Required env vars (set in Vercel + locally):
//   TURSO_DATABASE_URL  e.g. libsql://<db>.turso.io
//   TURSO_AUTH_TOKEN    auth token from `turso db tokens create <db>`
// ---------------------------------------------------------------------------

// Cache the client across hot reloads (Next.js dev) and module re-evaluations.
const globalForDb = globalThis as unknown as { __fanHubClient?: Client };

function createClientInstance(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    throw new Error(
      'TURSO_DATABASE_URL is not set. Configure Turso (or a local libsql file URL) before running.'
    );
  }
  return createClient({ url, authToken: token });
}

// Internal: cached raw libSQL client. Used by `ensureSchema()` and by the
// schema-aware wrapper returned from `getDb()`. Kept private so that all
// outside access goes through `getDb()`, which guarantees schema init.
function getRawClient(): Client {
  if (!globalForDb.__fanHubClient) {
    globalForDb.__fanHubClient = createClientInstance();
  }
  return globalForDb.__fanHubClient;
}

// ---------------------------------------------------------------------------
// Schema bootstrap. Idempotent — safe to call on every cold start. The result
// is cached so the DDL runs at most once per process, and is retried on failure
// (the cached promise is reset so a later call can recover).
// ---------------------------------------------------------------------------
let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getRawClient();
      await db.batch([
        `CREATE TABLE IF NOT EXISTS content (
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
        )`,
        `CREATE INDEX IF NOT EXISTS idx_content_type_created
          ON content (type, created_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_content_created
          ON content (created_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_content_user
          ON content (user_id)`,
        `CREATE TABLE IF NOT EXISTS hero (
          id          TEXT PRIMARY KEY,
          slot        INTEGER NOT NULL UNIQUE,
          title       TEXT NOT NULL DEFAULT '',
          subtitle    TEXT NOT NULL DEFAULT '',
          file_path   TEXT NOT NULL,
          mime        TEXT NOT NULL,
          created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS users (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          username    TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role        TEXT NOT NULL DEFAULT 'user',
          avatar      TEXT,
          created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS likes (
          user_id     TEXT NOT NULL,
          content_id  TEXT NOT NULL,
          created_at  TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (user_id, content_id)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_likes_user ON likes (user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_likes_content ON likes (content_id)`,
      ], 'write');
    })().catch((err) => {
      // Reset so a later call can retry instead of caching the rejection.
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

// ---------------------------------------------------------------------------
// Schema-aware client. Every query (execute / batch) awaits `ensureSchema()`
// FIRST, so the tables are guaranteed to exist before the first statement ever
// reaches a brand-new (empty) Turso database.
//
// This centralizes the initialization guarantee: no route handler can forget to
// call `ensureSchema()`, because the wrapper enforces it on every access. It is
// the fix for "no such table: users / content / hero" on first deploy.
// ---------------------------------------------------------------------------
class SchemaReadyDb {
  private client: Client = getRawClient();

  private ready(): Promise<void> {
    return ensureSchema();
  }

  execute(query: InStatement): Promise<ResultSet> {
    return this.ready().then(() => this.client.execute(query));
  }

  batch(stmts: InStatement[], mode?: 'write' | 'read'): Promise<ResultSet[]> {
    return this.ready().then(() => this.client.batch(stmts, mode));
  }
}

export function getDb(): SchemaReadyDb {
  return new SchemaReadyDb();
}
