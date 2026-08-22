'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Avatar — renders the user's uploaded photo, or a generated default
 * placeholder (initial letter on a brand-gradient circle) when none exists.
 *
 * iOS-style image swap: when `src` changes (e.g. right after an upload), the
 * OLD image fades out while the NEW image fades in — a soft cross-fade rather
 * than a hard cut. This matches the iOS Human Interface Guideline feel:
 *  - Entering element uses ease-OUT, exiting uses ease-IN (per HIG).
 *  - Duration ~0.28s (within the 150–300ms micro-interaction window).
 *  - `prefers-reduced-motion` users get an instant swap (no opacity tween).
 *
 * Purely presentational; sizing is controlled by the `size` prop.
 */
export function Avatar({
  username,
  src,
  size = 36,
  className = '',
}: {
  username: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const initial = (username?.[0] ?? '?').toUpperCase();

  // We keep two layers: the currently-shown image and the incoming one, so we
  // can cross-fade between them. `displaySrc` is what's painted; `src` is the
  // target. When they differ we fade the old out and the new in.
  const [displaySrc, setDisplaySrc] = useState<string | null>(
    src && !errored ? src : null
  );
  const prevSrc = useRef<string | null>(src && !errored ? src : null);

  useEffect(() => {
    const target = src && !errored ? src : null;
    if (target === prevSrc.current) return;
    prevSrc.current = target;
    // Small delay lets the new <img> begin decoding before we flip the
    // visible layer, keeping the cross-fade smooth instead of flashing.
    const t = setTimeout(() => setDisplaySrc(target), 30);
    return () => clearTimeout(t);
  }, [src, errored]);

  const showImage = displaySrc && !errored;

  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-accent text-white font-semibold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-label={username}
    >
      {/* Default placeholder — always rendered underneath; fades in when there
          is no image, fades out when an image appears. */}
      <span
        className="absolute inset-0 flex items-center justify-center avatar-layer"
        style={{ opacity: showImage ? 0 : 1 }}
        aria-hidden={showImage || undefined}
      >
        {initial}
      </span>

      {/* Uploaded photo — fades in over the placeholder, fades out on change. */}
      {displaySrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displaySrc}
          alt={username}
          onError={() => setErrored(true)}
          className="absolute inset-0 h-full w-full object-cover avatar-layer"
          style={{ opacity: errored ? 0 : 1 }}
        />
      ) : null}
    </span>
  );
}
