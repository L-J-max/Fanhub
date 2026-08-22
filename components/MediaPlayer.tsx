import type { ContentType } from '@/lib/types';

export default function MediaPlayer({
  type,
  fileUrl,
  textBody,
}: {
  type: ContentType;
  fileUrl: string | null;
  textBody: string | null;
}) {
  if (type === 'video') {
    return (
      <video
        controls
        preload="metadata"
        className="w-full rounded-2xl bg-black"
        aria-label="视频播放器"
      >
        {fileUrl ? <source src={fileUrl} /> : null}
        您的浏览器不支持视频播放。
      </video>
    );
  }

  if (type === 'audio') {
    return (
      <div className="rounded-2xl bg-surface-muted border border-surface-border p-6">
        <audio
          controls
          preload="metadata"
          className="w-full"
          aria-label="音频播放器"
        >
          {fileUrl ? <source src={fileUrl} /> : null}
          您的浏览器不支持音频播放。
        </audio>
      </div>
    );
  }

  // image
  if (type === 'image') {
    return (
      <div className="rounded-2xl overflow-hidden border border-surface-border bg-surface-muted">
        <ImageViewer fileUrl={fileUrl} />
      </div>
    );
  }

  // text
  return (
    <article className="rounded-2xl bg-surface border border-surface-border p-6 whitespace-pre-wrap leading-relaxed text-ink">
      {textBody}
    </article>
  );
}

// Render images via <img>. The file is served through /api/file which sets the
// correct content-type and supports range requests.
export function ImageViewer({ fileUrl }: { fileUrl: string | null }) {
  if (!fileUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fileUrl}
      alt=""
      className="w-full rounded-2xl bg-surface-muted object-contain max-h-[70vh]"
    />
  );
}
