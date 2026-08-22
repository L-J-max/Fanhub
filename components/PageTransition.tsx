'use client';

/**
 * PageTransition — a universal, app-wide route transition.
 *
 * Design goals (replacing the old jelly "curtain" overlay):
 *  - Every route change plays the SAME smooth transition, so navigation feels
 *    consistent everywhere (home ↔ feed, login, upload, me, content detail…).
 *  - The motion is a gentle `fade + slide-up + subtle scale` driven by a custom
 *    easing curve (`--ease-soft`, cubic-bezier(.22,1,.36,1)) — the iOS-style
 *    "ease-out expo" that decelerates into place. No harsh wipes, no jank.
 *  - We key the wrapper on `pathname` so React remounts it on navigation,
 *    re-triggering the CSS entrance animation each time.
 *  - `prefers-reduced-motion` users get an instant, opacity-only fade.
 *
 * Implementation note: we DON'T intercept Next's router; we simply detect the
 * pathname change and re-run the entrance animation. Exits are instantaneous
 * (the new page animates in on top), which reads as a clean cross-fade/slide.
 */
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // `key` forces a remount per route; we also track an "entering" flag so the
  // animation restarts even on hash-only or identical re-renders.
  const [displayKey, setDisplayKey] = useState(pathname);
  const prev = useRef(pathname);

  useEffect(() => {
    if (prev.current !== pathname) {
      prev.current = pathname;
      setDisplayKey(pathname);
      // scroll back to top on route change for a fresh start
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [pathname]);

  return (
    <div key={displayKey} className="route-enter">
      {children}
    </div>
  );
}
