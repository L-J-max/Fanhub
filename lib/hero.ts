import fs from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { getDb, HERO_DIR } from './db';

/** Number of hero slots on the first screen. */
export const HERO_SLOT_COUNT = 3;

/** Max size for a hero image upload (10 MB). */
export const MAX_HERO_IMAGE_SIZE = 10 * 1024 * 1024;

/** Allowed image MIME types mapped to the extension we store. */
const HERO_ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

export function getHeroExtForMime(mime: string): string | null {
  const normalized = mime.toLowerCase().split(';')[0].trim();
  return HERO_ALLOWED_MIME[normalized] ?? null;
}

export interface HeroSlide {
  id: string;
  slot: number;
  title: string;
  subtitle: string;
  url: string;
}

/** Returns hero slides ordered by slot. */
export function getHeroSlides(): HeroSlide[] {
  const rows = getDb()
    .prepare('SELECT id, slot, title, subtitle FROM hero ORDER BY slot ASC')
    .all() as unknown as { id: string; slot: number; title: string; subtitle: string }[];
  return rows.map((r) => ({
    id: r.id,
    slot: r.slot,
    title: r.title,
    subtitle: r.subtitle,
    url: `/api/hero/${r.id}`,
  }));
}

/**
 * Upserts a hero slide for the given slot. The previous image file for that
 * slot (if any) is removed from disk. Returns the new slide id.
 */
export async function upsertHeroSlide(params: {
  slot: number;
  title: string;
  subtitle: string;
  data: Uint8Array;
  ext: string;
  mime: string;
}): Promise<string> {
  const { slot, title, subtitle, data, ext, mime } = params;
  const db = getDb();

  const old = db
    .prepare('SELECT file_path FROM hero WHERE slot = ?')
    .get(slot) as unknown as { file_path: string } | undefined;
  if (old?.file_path) {
    try {
      await fs.unlink(path.join(HERO_DIR, old.file_path));
    } catch {
      // previous file may already be gone; ignore
    }
  }

  const id = nanoid();
  const storedName = `${id}.${ext}`;
  await fs.mkdir(HERO_DIR, { recursive: true });
  await fs.writeFile(path.join(HERO_DIR, storedName), data);

  db.prepare(
    `INSERT INTO hero (id, slot, title, subtitle, file_path, mime)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(slot) DO UPDATE SET
       id=excluded.id,
       title=excluded.title,
       subtitle=excluded.subtitle,
       file_path=excluded.file_path,
       mime=excluded.mime,
       created_at=datetime('now')`
  ).run(id, slot, title.trim(), subtitle.trim(), storedName, mime);

  return id;
}

export function getHeroImage(
  id: string
): { file_path: string; mime: string } | null {
  const row = getDb()
    .prepare('SELECT file_path, mime FROM hero WHERE id = ?')
    .get(id) as unknown as { file_path: string; mime: string } | undefined;
  if (!row) return null;
  return { file_path: row.file_path, mime: row.mime };
}

/** Resolves a stored hero name to an absolute path, guarding path traversal. */
export function resolveHeroPath(storedName: string): string | null {
  const base = path.resolve(HERO_DIR);
  const resolved = path.resolve(HERO_DIR, storedName);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    return null;
  }
  return resolved;
}
