'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, CheckCircle2, Loader2 } from 'lucide-react';

interface SlideState {
  slot: number;
  title: string;
  subtitle: string;
  url?: string;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

export default function HeroManager() {
  const [slides, setSlides] = useState<SlideState[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/hero');
      const d = (await res.json()) as { slides: SlideState[] };
      const arr: SlideState[] = [0, 1, 2].map((slot) => {
        const found = d.slides?.find((s) => s.slot === slot);
        return found
          ? { slot, title: found.title, subtitle: found.subtitle, url: found.url }
          : { slot, title: '', subtitle: '' };
      });
      setSlides(arr);
    } catch {
      setErr('加载当前首屏失败，请刷新重试。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink">管理首屏轮播</h1>
        <p className="mt-2 text-ink-muted max-w-2xl">
          上传本地图片即可替换首页第一屏的展示照片。共 3 个位置，每个位置可单独更换；
          留空的标题与副标题将沿用默认文案。支持 JPG / PNG / GIF / WebP / SVG，单张不超过 10 MB。
        </p>
      </div>

      {msg && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4" aria-hidden />
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-ink-muted">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> 加载中…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {slides.map((s) => (
            <SlotCard
              key={s.slot}
              slide={s}
              onSaved={() => {
                setMsg(`第 ${s.slot + 1} 张已更新`);
                load();
              }}
              onError={(e) => setErr(e)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SlotCard({
  slide,
  onSaved,
  onError,
}: {
  slide: SlideState;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [title, setTitle] = useState(slide.title);
  const [subtitle, setSubtitle] = useState(slide.subtitle);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>(slide.url);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // keep local fields in sync when parent reloads data
  useEffect(() => {
    setTitle(slide.title);
    setSubtitle(slide.subtitle);
    setPreview(slide.url);
  }, [slide.title, slide.subtitle, slide.url]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    }
  }

  async function save() {
    if (!file) {
      onError('请先选择一张图片');
      return;
    }
    setSaving(true);
    try {
      const dataUrl = await readAsDataURL(file);
      const base64 = dataUrl.split(',')[1];
      const res = await fetch('/api/hero/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot: slide.slot,
          title,
          subtitle,
          file: { data: base64, mime: file.type },
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || '上传失败');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl bg-surface border border-surface-border shadow-card overflow-hidden">
      <div className="relative aspect-[16/9] bg-surface-muted">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-subtle">
            <ImageIcon className="w-8 h-8" aria-hidden />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
          位置 {slide.slot + 1}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <label className="text-xs font-medium text-ink-muted">
          标题
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：发现精彩内容"
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="text-xs font-medium text-ink-muted">
          副标题
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="一句话描述"
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          onChange={onPick}
          className="block w-full text-sm text-ink-subtle file:mr-3 file:rounded-full file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink-muted hover:file:bg-surface-border cursor-pointer"
        />

        <button
          onClick={save}
          disabled={saving || !file}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="w-4 h-4" aria-hidden />
          )}
          {saving ? '保存中…' : '上传并替换'}
        </button>
      </div>
    </div>
  );
}
