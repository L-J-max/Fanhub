'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlayCircle, Upload, SlidersHorizontal, LogOut, X } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { Avatar } from './Avatar';
import AvatarUploader from './AvatarUploader';

export default function SiteHeader() {
  const { user, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [avatarModal, setAvatarModal] = useState(false);

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  // Close the avatar modal on Escape.
  useEffect(() => {
    if (!avatarModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAvatarModal(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [avatarModal]);

  return (
    <header className="sticky top-0 z-30 border-b border-surface-border bg-surface/85 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-ink cursor-pointer">
          <PlayCircle className="w-6 h-6 text-brand" aria-hidden />
          <span>FanHub</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/feed"
            className="px-3 py-2 rounded-full text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors duration-200 cursor-pointer"
          >
            浏览
          </Link>
          {user ? (
            <>
              {/* Mobile: small tappable avatar opens the change-avatar modal. */}
              <button
                type="button"
                onClick={() => setAvatarModal(true)}
                title="点击更换头像"
                aria-label="点击更换头像"
                className="md:hidden inline-flex items-center rounded-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Avatar username={user.username} src={user.avatarUrl} size={28} />
              </button>
              {/* "我的" text link stays available on all breakpoints. */}
              <Link
                href="/me"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors duration-200 cursor-pointer"
              >
                <span className="hidden sm:inline">我的</span>
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-2 rounded-full text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors duration-200 cursor-pointer"
            >
              登录
            </Link>
          )}
          {isAdmin ? (
            <Link
              href="/manage/hero"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors duration-200 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden />
              <span className="hidden sm:inline">管理首屏</span>
            </Link>
          ) : null}
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors duration-200 cursor-pointer"
          >
            <Upload className="w-4 h-4" aria-hidden />
            上传
          </Link>
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              title="退出登录"
              aria-label="退出登录"
              className="inline-flex items-center justify-center p-2 rounded-full text-ink-muted hover:text-brand hover:bg-surface-muted transition-colors duration-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4" aria-hidden />
            </button>
          ) : null}
          {user ? (
            /* Desktop: tapping the avatar opens the change-avatar modal. */
            <button
              type="button"
              onClick={() => setAvatarModal(true)}
              className="hidden md:inline-flex items-center gap-2 pl-1 rounded-full hover:bg-surface-muted px-2 py-1 transition-colors duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent"
              title="点击更换头像"
              aria-label="点击更换头像"
            >
              <Avatar username={user.username} src={user.avatarUrl} size={32} />
              <span className="text-sm font-medium text-ink-muted flex items-center gap-1.5">
                {isAdmin ? (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                    管理员
                  </span>
                ) : null}
                {user.username}
              </span>
            </button>
          ) : null}
        </nav>
      </div>

      {/* iOS-style avatar-change modal: tap the header avatar to open. The
          modal fades + scales in; inside sits <AvatarUploader>, whose own
          action sheet offers 相册 / 拍照. Reduced-motion users get instant
          state changes (handled in CSS). */}
      {avatarModal && user ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="更换头像"
        >
          <div
            className="absolute inset-0 bg-black/40 ios-fade"
            onClick={() => setAvatarModal(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-surface border border-surface-border shadow-2xl ios-sheet p-6">
            <button
              type="button"
              onClick={() => setAvatarModal(false)}
              aria-label="关闭"
              className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full p-1.5 text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors duration-200 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
            <h3 className="text-center text-base font-semibold text-ink mb-5">
              更换头像
            </h3>
            <AvatarUploader
              username={user.username}
              current={user.avatarUrl}
              size={96}
              onUploaded={() => {
                // Keep modal open briefly so the cross-fade is visible, then
                // close. The header avatar updates via AuthProvider cache.
                setTimeout(() => setAvatarModal(false), 650);
              }}
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}
