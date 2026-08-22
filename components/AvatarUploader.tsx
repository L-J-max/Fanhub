'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Camera, Image as ImageIcon, X } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { Avatar } from './Avatar';

/**
 * AvatarUploader — iOS-style "tap avatar to change" control.
 *
 * Interaction model (mirrors the iOS Human Interface Guidelines):
 *  1. The avatar is a tappable button. Tapping it opens a bottom action sheet
 *     with two iOS-native choices: "从相册选择" (opens the photo library,
 *     no `capture`) and "拍照" (opens the camera via `capture="environment"`).
 *  2. During the async upload we show a soft spinner overlay that FADES in over
 *     the avatar — no hard cut, no layout shift.
 *  3. On success the new photo cross-fades in via <Avatar>'s own swap animation;
 *     on failure a gentle error line fades in. Reduced-motion users get instant
 *     state changes (no fades), per accessibility requirements.
 *
 * The actual upload POSTs base64 + mime to /api/auth/avatar; the parent's
 * `useAuth().uploadAvatar` refreshes the cached user so the header updates.
 */
export default function AvatarUploader({
  username,
  current,
  onUploaded,
  size = 96,
}: {
  username: string;
  current?: string | null;
  onUploaded?: () => void;
  size?: number;
}) {
  const { uploadAvatar } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Two hidden inputs: one for the photo library, one for the camera. Splitting
  // them lets the action sheet offer both options on iOS (where `capture` would
  // otherwise force the camera directly).
  const libInputRef = useRef<HTMLInputElement>(null);
  const camInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close the action sheet on outside click / Escape (iOS sheet behaviour).
  useEffect(() => {
    if (!sheetOpen) return;
    function onDoc(e: MouseEvent) {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setSheetOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSheetOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [sheetOpen]);

  async function handleFile(file: File) {
    setSheetOpen(false);
    setErr(null);
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsDataURL(file);
      });
      const [meta, base64] = dataUrl.split(',');
      const mime = (meta.match(/data:(.*?);/)?.[1] ?? (file.type || '')).trim();
      await uploadAvatar(base64, mime);
      onUploaded?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '上传失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Tappable avatar — opens the action sheet. */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        disabled={busy}
        title="点击更换头像"
        aria-label="点击更换头像"
        aria-haspopup="dialog"
        className="relative rounded-full cursor-pointer disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <Avatar username={username} src={current} size={size} />

        {/* Soft spinner overlay — fades in during upload (no hard cut). */}
        <span
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 backdrop-blur-[1px] transition-opacity duration-300"
          style={{ opacity: busy ? 1 : 0, pointerEvents: 'none' }}
          aria-hidden={!busy}
        >
          <Loader2 className="w-6 h-6 text-white animate-spin" aria-hidden />
        </span>
      </button>

      {/* iOS-style bottom action sheet. Backdrop + sheet fade/scale in using
          the same soft easing; respects reduced-motion via CSS. */}
      {sheetOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="更换头像"
        >
          {/* Dimmed backdrop */}
          <div
            className="absolute inset-0 bg-black/40 ios-fade"
            onClick={() => setSheetOpen(false)}
            aria-hidden
          />
          <div
            ref={sheetRef}
            className="relative w-full max-w-sm mx-3 mb-3 sm:mb-0 rounded-2xl bg-surface border border-surface-border shadow-2xl ios-sheet"
          >
            <div className="px-5 pt-4 pb-2 text-center">
              <p className="text-sm font-semibold text-ink">更换头像</p>
              <p className="mt-1 text-xs text-ink-subtle">选择照片来源</p>
            </div>
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => libInputRef.current?.click()}
                className="flex items-center gap-3 px-5 py-3.5 text-left text-sm font-medium text-ink hover:bg-surface-muted transition-colors duration-200 cursor-pointer"
              >
                <ImageIcon className="w-5 h-5 text-accent" aria-hidden />
                从相册选择
              </button>
              <button
                type="button"
                onClick={() => camInputRef.current?.click()}
                className="flex items-center gap-3 px-5 py-3.5 text-left text-sm font-medium text-ink border-t border-surface-border hover:bg-surface-muted transition-colors duration-200 cursor-pointer"
              >
                <Camera className="w-5 h-5 text-accent" aria-hidden />
                拍照
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="flex w-full items-center justify-center gap-2 px-5 py-3.5 mt-1.5 text-sm font-semibold text-red-600 border-t border-surface-border hover:bg-surface-muted transition-colors duration-200 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden />
              取消
            </button>
          </div>

          {/* Hidden file inputs. `accept` allows jpg/png/webp/gif; the camera
              input adds `capture` so iOS opens the live camera directly. */}
          <input
            ref={libInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = '';
            }}
          />
          <input
            ref={camInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = '';
            }}
          />
        </div>
      ) : null}

      {err ? (
        <p className="text-xs text-red-600 ios-fade">{err}</p>
      ) : (
        <p className="text-xs text-ink-subtle">支持 JPG / PNG / WebP / GIF，≤ 5 MB</p>
      )}
    </div>
  );
}
