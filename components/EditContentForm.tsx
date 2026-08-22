'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';

export default function EditContentForm({
  id,
  initialTitle,
  initialText,
  isText,
}: {
  id: string;
  initialTitle: string;
  initialText: string | null;
  isText: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState(initialText ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function save() {
    if (!title.trim()) {
      setErr('标题不能为空');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/content/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), text: isText ? text : undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || '保存失败');
      setDone(true);
      setTimeout(() => router.push(`/content/${id}`), 600);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-ink">编辑内容</h1>

      {done ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          已保存，正在跳转到内容详情…
        </div>
      ) : null}

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <label className="block text-sm font-medium text-ink-muted">
        标题
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="mt-1 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-ink outline-none focus:border-accent"
        />
      </label>

      {isText ? (
        <label className="block text-sm font-medium text-ink-muted">
          正文
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="mt-1 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-ink outline-none focus:border-accent whitespace-pre-wrap leading-relaxed"
          />
        </label>
      ) : (
        <p className="text-sm text-ink-subtle">
          该类型内容仅支持修改标题，媒体文件不变。
        </p>
      )}

      <button
        onClick={save}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50 cursor-pointer"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Save className="w-4 h-4" aria-hidden />}
        {busy ? '保存中…' : '保存修改'}
      </button>
    </div>
  );
}
