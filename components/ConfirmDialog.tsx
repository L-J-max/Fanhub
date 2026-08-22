'use client';

import { useEffect } from 'react';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !busy && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-surface border border-surface-border p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-sm text-ink-muted">{message}</p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-surface-border px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
          >
            {busy ? '处理中…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
