'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowDown } from 'lucide-react';

export interface Slide {
  src: string;
  title: string;
  subtitle: string;
  theme?: string;
}

// Theme color per slot — the start page background shifts to match the photo
// currently on screen, reinforcing visual consistency / immersion.
const THEME_PRESETS = ['#E11D48', '#2563EB', '#7C3AED'];
const DEFAULT_THEME = '#E11D48';

const AUTOPLAY_MS = 6000;

// Best-effort dominant color extraction for uploaded photos so the ambient
// background reflects the actual image rather than a fixed preset.
function getDominantColor(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let r = 0,
          g = 0,
          b = 0,
          count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 125) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        if (!count) return resolve(null);
        resolve(`rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function HeroCarousel({
  initialSlides,
  onActiveTheme,
  onScrollHint,
}: {
  initialSlides: Slide[];
  onActiveTheme?: (color: string) => void;
  onScrollHint?: () => void;
}) {
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [theme, setTheme] = useState(initialSlides[0]?.theme || DEFAULT_THEME);

  // Load any admin-replaced hero photos from the API and overlay them onto the
  // default slides by slot (so replacing one photo keeps the others).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/hero')
      .then((r) => r.json())
      .then(
        (d: { slides?: { slot: number; title: string; subtitle: string; url: string }[] }) => {
          if (cancelled || !d?.slides?.length) return;
          const merged = [...initialSlides];
          for (const s of d.slides) {
            const i = Math.min(Math.max(s.slot, 0), merged.length - 1);
            merged[i] = {
              src: s.url,
              title: s.title || merged[i].title,
              subtitle: s.subtitle || merged[i].subtitle,
              theme: THEME_PRESETS[i] ?? DEFAULT_THEME,
            };
          }
          setSlides(merged);
          // Reflect the uploaded photo's real color in the ambient background.
          for (const s of d.slides) {
            const i = Math.min(Math.max(s.slot, 0), merged.length - 1);
            getDominantColor(s.url).then((color) => {
              if (!color || cancelled) return;
              setSlides((prev) => prev.map((p, idx) => (idx === i ? { ...p, theme: color } : p)));
            });
          }
        }
      )
      .catch(() => {
        /* keep defaults on failure */
      });
    return () => {
      cancelled = true;
    };
  }, [initialSlides]);

  // Keep the ambient theme in sync with the active slide.
  useEffect(() => {
    const t = slides[index]?.theme || DEFAULT_THEME;
    setTheme(t);
    onActiveTheme?.(t);
  }, [index, slides, onActiveTheme]);

  const go = useCallback(
    (next: number) => setIndex((prev) => (next + slides.length) % slides.length),
    [slides.length]
  );
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  // Auto-advance with a progress bar; pauses on hover / focus.
  useEffect(() => {
    if (paused) return;
    setProgress(0);
    const start = Date.now();
    const tick = setInterval(() => {
      setProgress(Math.min(100, ((Date.now() - start) / AUTOPLAY_MS) * 100));
    }, 60);
    const advance = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => {
      clearInterval(tick);
      clearInterval(advance);
    };
  }, [paused, index, slides.length]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="网站精选展示"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="relative -mx-4 sm:-mx-6 -mt-6 h-[calc(100svh-4rem)] overflow-hidden select-none"
    >
      {/* Slides: crossfade via opacity */}
      {slides.map((s, i) => (
        <div
          key={i}
          aria-hidden={i !== index}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.src} alt="" draggable={false} className="h-full w-full object-cover" />
        </div>
      ))}

      {/* Dynamic themed background — the start page hue follows the active photo.
          soft-light wash tints the image; inset glow frames it. Both animate. */}
      <div
        className="pointer-events-none absolute inset-0 transition-[background-color] duration-700 ease-in-out"
        style={{ backgroundColor: theme, mixBlendMode: 'soft-light', opacity: 0.45 }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 transition-[box-shadow] duration-700 ease-in-out"
        style={{ boxShadow: `inset 0 0 220px 70px ${theme}` }}
        aria-hidden
      />

      {/* Scrims for control contrast */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/25" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

      {/* Caption — absolutely layered ON TOP of the hero photo. A bottom-up
          gradient scrim guarantees legibility against any image; sizing is
          responsive (smaller on mobile, large on desktop/tablet). */}
      <div className="absolute inset-0 flex flex-col items-start justify-end px-5 pb-24 pt-20 sm:px-10 sm:pb-28 lg:px-20">
        <div
          key={index}
          className="animate-hero-rise max-w-3xl"
        >
          <h2 className="text-3xl font-extrabold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">
            {slides[index].title}
          </h2>
          {slides[index].subtitle ? (
            <p
              key={`sub-${index}`}
              className="mt-3 max-w-xl text-sm text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] sm:text-lg"
            >
              {slides[index].subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {/* Prev / Next arrows */}
      <button
        type="button"
        onClick={prev}
        aria-label="上一张"
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur transition-colors duration-200 hover:bg-white/30 focus-visible:bg-white/30 sm:left-6 sm:p-3"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="下一张"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur transition-colors duration-200 hover:bg-white/30 focus-visible:bg-white/30 sm:right-6 sm:p-3"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
      </button>

      {/* Indicator dots */}
      <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`跳转到第 ${i + 1} 张`}
            aria-current={i === index}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              i === index ? 'w-7 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>

      {/* Autoplay progress bar */}
      <div className="absolute bottom-0 left-0 h-1 w-full bg-white/15">
        <div
          className="h-full bg-white transition-[width] duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Scroll hint → triggers the silky transition to the content page */}
      <button
        type="button"
        onClick={onScrollHint}
        aria-label="向下浏览内容"
        className="absolute bottom-12 left-1/2 -translate-x-1/2 cursor-pointer bg-transparent p-0 text-white/80 transition-colors duration-200 hover:text-white"
      >
        <ArrowDown className="h-6 w-6 animate-bounce" aria-hidden />
      </button>
    </section>
  );
}
