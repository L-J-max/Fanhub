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
//   BLOB_READ_WRITE_TOKEN  from `vercel blob token` / project dashboard
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
  const opts: PutCommandOptions = {
    access: 'public',
    contentType: mime,
    // Deterministic-ish name with allowed characters only (Blob is strict).
    allowOverwrite: true,
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
    await del(url);
  } catch {
    /* remote object may already be gone; ignore */
  }
}
