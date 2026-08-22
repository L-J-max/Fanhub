'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ContentFeed from '@/components/ContentFeed';
import { Upload, Video, FileText, Music, Image as ImageIcon, ArrowLeft } from 'lucide-react';

export default function FeedPage() {
  const router = useRouter();
  const touchStartY = useRef<number | null>(null);

  // Return to the start page. The visual transition is handled globally by
  // <PageTransition>; here we only trigger the route change when the user
  // scrolls up (wheel) or swipes down while already at the top of the feed.
  const goToHome = () => {
    router.push('/');
  };

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0 && window.scrollY < 8) goToHome();
    };
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      const endY = e.changedTouches[0]?.clientY ?? 0;
      const dy = endY - touchStartY.current; // positive = swipe down
      if (dy > 40 && window.scrollY < 8) goToHome();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-surface-border bg-gradient-to-br from-brand/5 to-accent/5 p-6 sm:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">粉丝内容分享平台</h1>
            <p className="mt-2 max-w-2xl text-ink-muted">
              浏览粉丝上传的视频、图片、文本与音频内容，无需登录即可观看并为喜欢的内容点赞。
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-medium text-white transition-colors duration-200 hover:bg-accent-dark"
              >
                <Upload className="h-4 h-4" aria-hidden />
                上传内容
              </Link>
              <div className="flex items-center gap-4 text-sm text-ink-subtle">
                <span className="inline-flex items-center gap-1.5">
                  <Video className="h-4 h-4" aria-hidden /> 视频
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ImageIcon className="h-4 h-4" aria-hidden /> 图片
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-4 h-4" aria-hidden /> 文本
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Music className="h-4 h-4" aria-hidden /> 音频
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-surface-border px-4 py-2 text-sm font-medium text-ink-muted transition-colors duration-200 hover:bg-surface-muted hover:text-ink cursor-pointer"
          >
            <ArrowLeft className="h-4 h-4" aria-hidden />
            返回开始
          </Link>
        </div>
      </section>

      <ContentFeed />
    </div>
  );
}
