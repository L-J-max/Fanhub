'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

export default function DeleteButton({
  id,
  onDeleted,
  variant = 'icon',
  label = '删除内容',
}: {
  id: string;
  onDeleted?: () => void;
  variant?: 'icon' | 'full';
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function doDelete() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/content/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || '删除失败');
      }
      setOpen(false);
      if (onDeleted) onDeleted();
      else router.push('/');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '删除失败');
    } finally {
      setBusy(false);
    }
  }

  const className =
    variant === 'icon'
      ? 'inline-flex items-center justify-center rounded-full p-2 text-ink-muted transition-colors duration-200 hover:text-red-600 hover:bg-red-50 focus-visible:bg-red-50 cursor-pointer'
      : 'inline-flex items-center gap-1.5 rounded-full border border-surface-border px-4 py-2 text-sm font-medium text-ink-muted transition-colors duration-200 hover:text-red-600 hover:border-red-200 cursor-pointer';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-label="删除内容"
      >
        <Trash2 className="w-4 h-4" aria-hidden />
        {variant === 'full' && <span>{label}</span>}
      </button>
      <ConfirmDialog
        open={open}
        title="删除内容"
        message="确定要删除这条内容吗？删除后无法恢复，相关文件也会一并移除。"
        confirmText="删除"
        busy={busy}
        error={err}
        onConfirm={doDelete}
        onCancel={() => {
          setOpen(false);
          setErr(null);
        }}
      />
    </>
  );
}
