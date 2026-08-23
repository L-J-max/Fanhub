import { put } from '@vercel/blob';
import type { PutCommandOptions } from '@vercel/blob';

// ---------------------------------------------------------------------------
// File storage — Vercel Blob (replaces the old local-filesystem uploads).
//
// On Vercel, the serverless filesystem is read-only / ephemeral, so we cannot
// persist uploaded media locally. Instead every upload is written to Vercel
// Blob and we store the resulting **public URL** in the database (the
// `file_path` column now holds a full https URL rather than a local name).
//
// Env (set in Vercel + locally):
//   BLOB_READ_WRITE_TOKEN       read/write credentials for the Blob store
//   BLOB_STORE_ID3_STORE_ID     the public Fanhub-blob2 store id
// ---------------------------------------------------------------------------

/**
 * Uploads raw bytes to Vercel Blob and returns the public URL.
 * `pathname` should be namespaced, e.g. `uploads/<id>.<ext>` or
 * `avatars/<id>.<ext>` or `hero/<id>.<ext>`.
 */
export async function saveBlob(
  pathname: string,
  data: Uint8Array,
  mime: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  }
  const opts: PutCommandOptions = {
    access: 'public',
    contentType: mime,
    // Deterministic-ish name with allowed characters only (Blob is strict).
    allowOverwrite: true,
    token,
    // The project has multiple Blob stores connected; pin to the public
    // Fanhub-blob2 store so the SDK does not resolve to another (private) one.
    storeId: process.env.BLOB_STORE_ID3_STORE_ID,
  };
  const blob = await put(pathname, Buffer.from(data), opts);
  return blob.url;
}

/**
 * Deletes a previously stored Blob by its public URL. Best-effort: failures
 * are swallowed because a missing remote object should not break a delete.
 */
export async function deleteBlobByUrl(url: string | null): Promise<void> {
  if (!url) return;
  try {
    const { del } = await import('@vercel/blob');
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    await del(url, token ? { token } : undefined);
  } catch {
    /* remote object may already be gone; ignore */
  }
}
