import type { ContentType } from './types';

export function formatSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Formats a SQLite UTC timestamp ("YYYY-MM-DD HH:MM:SS") in local time. */
export function formatDate(utc: string): string {
  const iso = utc.includes('T') ? utc : utc.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return utc;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const TYPE_LABEL: Record<ContentType, string> = {
  video: '视频',
  text: '文本',
  audio: '音频',
  image: '图片',
};
