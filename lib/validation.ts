import type { ContentType } from './types';

/** Allowed content types. */
export const CONTENT_TYPES: ContentType[] = ['video', 'text', 'audio', 'image'];

/** Upload size limits (bytes). */
export const MAX_SIZE = {
  video: 200 * 1024 * 1024, // 200 MB
  audio: 50 * 1024 * 1024, // 50 MB
  image: 10 * 1024 * 1024, // 10 MB
  text: 50 * 1024, // 50 KB
} as const;

export const MAX_TITLE_LENGTH = 200;
export const SNIPPET_LENGTH = 200;

/**
 * MIME whitelist mapped to the extension we will derive server-side.
 * We never trust the user-supplied filename.
 */
export const ALLOWED_MIME: Record<ContentType, Record<string, string>> = {
  video: {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  },
  audio: {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/webm': 'weba',
  },
  image: {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/avif': 'avif',
  },
  text: {},
};

/** Returns the derived extension for a given type+mime, or null if disallowed. */
export function getExtensionForMime(
  type: ContentType,
  mime: string
): string | null {
  const map = ALLOWED_MIME[type];
  if (!map) return null;
  const normalized = mime.toLowerCase().split(';')[0].trim();
  return map[normalized] ?? null;
}

export function isValidType(value: unknown): value is ContentType {
  return typeof value === 'string' && (CONTENT_TYPES as string[]).includes(value);
}

export function isValidTitle(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_TITLE_LENGTH;
}

export interface UploadValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Validates an incoming upload payload before any file is written.
 * For media types a File + valid MIME + size check is required.
 */
export function validateUpload(params: {
  type: ContentType;
  title: string;
  text?: string;
  file?: File | null;
}): UploadValidationResult {
  const { type, title, text, file } = params;

  if (!isValidTitle(title)) {
    return { ok: false, error: `标题必填且不超过 ${MAX_TITLE_LENGTH} 字` };
  }

  if (type === 'text') {
    if (typeof text !== 'string' || text.trim().length === 0) {
      return { ok: false, error: '文本内容不能为空' };
    }
    if (text.length > MAX_SIZE.text) {
      return { ok: false, error: `文本长度不超过 ${MAX_SIZE.text / 1024} KB` };
    }
    return { ok: true };
  }

  // media types require a file
  if (!file || typeof file === 'string') {
    return { ok: false, error: '请选择要上传的文件' };
  }
  if (file.size === 0) {
    return { ok: false, error: '文件为空' };
  }
  const ext = getExtensionForMime(type, file.type);
  if (!ext) {
    return { ok: false, error: `不支持的文件格式：${file.type || '未知'}` };
  }
  const limit = MAX_SIZE[type];
  if (file.size > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    return { ok: false, error: `文件超过 ${mb} MB 上限` };
  }
  return { ok: true };
}
