import fs from 'node:fs/promises';
import path from 'node:path';
import { UPLOAD_DIR } from './db';

/**
 * Persists an uploaded file to the uploads directory.
 * Accepts raw bytes (from a base64-decoded JSON payload) — never trusts a
 * user-supplied filename, preventing path traversal / spoofing.
 * Returns the relative stored name (e.g. "<id>.mp4").
 */
export async function saveUploadFile(
  id: string,
  ext: string,
  data: Uint8Array
): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const storedName = `${id}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, storedName), data);
  return storedName;
}

/**
 * Resolves a stored upload name to an absolute path, guarding against path
 * traversal. Returns null when the resolved path escapes UPLOAD_DIR.
 */
export function resolveUploadPath(storedName: string): string | null {
  const base = path.resolve(UPLOAD_DIR);
  const resolved = path.resolve(UPLOAD_DIR, storedName);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    return null;
  }
  return resolved;
}
