import { nanoid } from 'nanoid';
import { getDb } from './db';
import { saveBlob, deleteBlobByUrl } from './upload';

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

// libsql returns rows as arrays of objects.
type Row = Record<string, unknown>;
function rows(r: { rows: unknown }): Row[] {
  return (r.rows as Row[]) ?? [];
}

/** Returns hero slides ordered by slot. `url` is the public Blob URL. */
export async function getHeroSlides(): Promise<HeroSlide[]> {
  const result = await getDb().execute(
    'SELECT id, slot, title, subtitle, file_path FROM hero ORDER BY slot ASC'
  );
  return rows(result).map((r) => ({
    id: String(r.id),
    slot: Number(r.slot),
    title: String(r.title ?? ''),
    subtitle: String(r.subtitle ?? ''),
    url: String(r.file_path ?? ''), // now a full Blob URL
  }));
}

/**
 * Upserts a hero slide for the given slot. The previous image (Blob URL) is
 * removed from Blob storage. Returns the new slide id.
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

  const old = firstRow(
    await db.execute({ sql: 'SELECT file_path FROM hero WHERE slot = ?', args: [slot] })
  );
  if (old?.file_path) {
    await deleteBlobByUrl(String(old.file_path));
  }

  const id = nanoid();
  const url = await saveBlob(`hero/${id}.${ext}`, data, mime);

  await db.execute({
    sql: `INSERT INTO hero (id, slot, title, subtitle, file_path, mime)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(slot) DO UPDATE SET
       id=excluded.id,
       title=excluded.title,
       subtitle=excluded.subtitle,
       file_path=excluded.file_path,
       mime=excluded.mime,
       created_at=datetime('now')`,
    args: [id, slot, title.trim(), subtitle.trim(), url, mime],
  });

  return id;
}

export async function getHeroImage(
  id: string
): Promise<{ url: string; mime: string } | null> {
  const row = firstRow(
    await getDb().execute({ sql: 'SELECT file_path, mime FROM hero WHERE id = ?', args: [id] })
  );
  if (!row) return null;
  return { url: String(row.file_path), mime: String(row.mime) };
}

function firstRow(r: { rows: unknown }): Row | undefined {
  const rs = r.rows as Row[];
  return rs && rs.length ? rs[0] : undefined;
}
