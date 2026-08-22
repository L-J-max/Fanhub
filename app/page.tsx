'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import HeroCarousel from '@/components/HeroCarousel';

const HERO_SLIDES = [
  {
    src: '/hero/slide-1.svg',
    title: '发现精彩内容',
    subtitle: '浏览粉丝创作的海量视频、图片、文本与音频，无需登录，即点即看。',
    theme: '#E11D48',
  },
  {
    src: '/hero/slide-2.svg',
    title: '分享你的创作',
    subtitle: '登录后即可上传你的作品，让更多同好看见你的声音与故事。',
    theme: '#2563EB',
  },
  {
    src: '/hero/slide-3.svg',
    title: '与粉丝同行',
    subtitle: '为你喜欢的内容点赞，连接彼此，共建属于粉丝的社区。',
    theme: '#7C3AED',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [theme, setTheme] = useState(HERO_SLIDES[0].theme);
  const touchStartY = useRef<number | null>(null);

  // Navigate into the content page. The actual fade/slide transition is now
  // handled globally by <PageTransition> (keyed on pathname), so here we only
  // need to trigger the route change on an intent gesture (wheel-down / swipe-up
  // while at the top of the start screen).
  const goToFeed = useCallback(() => {
    router.push('/feed');
  }, [router]);

  // Trigger the transition on downward wheel / upward swipe while at the top.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0 && window.scrollY < 8) goToFeed();
    };
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      const endY = e.changedTouches[0]?.clientY ?? 0;
      const dy = touchStartY.current - endY; // positive = swipe up
      if (dy > 40 && window.scrollY < 8) goToFeed();
      touchStartY.current = null;
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [goToFeed]);

  return (
    <HeroCarousel
      initialSlides={HERO_SLIDES}
      onActiveTheme={setTheme}
      onScrollHint={goToFeed}
    />
  );
}
