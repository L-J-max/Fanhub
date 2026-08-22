'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video, FileText, Music, Image as ImageIcon, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { validateUpload, MAX_SIZE } from '@/lib/validation';
import type { ContentType } from '@/lib/types';
import { formatSize } from '@/lib/format';
import { useAuth } from './AuthProvider';

const TYPE_OPTIONS: { value: ContentType; label: string; icon: typeof Video }[] = [
  { value: 'video', label: '视频', icon: Video },
  { value: 'text', label: '文本', icon: FileText },
  { value: 'audio', label: '音频', icon: Music },
  { value: 'image', label: '图片', icon: ImageIcon },
];

/** Reads a browser File as a base64 data string (data:<mime>;base64,<...>). */
function fileToBase64(file: File): Promise<{ data: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve({
        data: result.slice(comma + 1),
        mime: file.type || 'application/octet-stream',
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function UploadForm() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<ContentType>('video');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function switchType(t: ContentType) {
    setType(t);
    setFile(null);
    setText('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const check = validateUpload({
      type,
      title,
      text: type === 'text' ? text : undefined,
      file,
    });
    if (!check.ok) {
      setError(check.error ?? '提交失败');
      return;
    }

    const payload: Record<string, unknown> = { type, title: title.trim() };
    if (type === 'text') {
      payload.text = text;
    } else if (file) {
      try {
        const { data, mime } = await fileToBase64(file);
        payload.file = { data, mime };
      } catch {
        setError('文件读取失败，请重试');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? '上传失败');
      }
      const data = (await res.json()) as { id: string };
      setDone(true);
      setTimeout(() => router.push(`/content/${data.id}`), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setSubmitting(false);
    }
  }

  const accept =
    type === 'video'
      ? 'video/*'
      : type === 'audio'
        ? 'audio/*'
        : type === 'image'
          ? 'image/*'
          : undefined;
  const limitLabel =
    type === 'video'
      ? `最大 ${MAX_SIZE.video / (1024 * 1024)} MB`
      : type === 'audio'
        ? `最大 ${MAX_SIZE.audio / (1024 * 1024)} MB`
        : type === 'image'
          ? `最大 ${MAX_SIZE.image / (1024 * 1024)} MB`
          : `最大 ${MAX_SIZE.text / 1024} KB`;

  // Publishing requires a login.
  if (!loading && !user) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="rounded-full bg-surface-muted p-4 text-ink-subtle">
          <Lock className="w-7 h-7" aria-hidden />
        </div>
        <div>
          <p className="font-medium text-ink">登录后即可发布内容</p>
          <p className="mt-1 text-sm text-ink-muted">
            设置用户名和密码，登录后你的作品会出现在「我的 / 作品」中。
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 font-medium text-white transition-colors duration-200 hover:bg-accent-dark"
          >
            去登录 / 注册
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Type selector */}
      <div className="grid grid-cols-4 gap-3">
        {TYPE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = type === opt.value;
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => switchType(opt.value)}
              className={`flex flex-col items-center gap-2 py-4 rounded-2xl border transition-colors duration-200 cursor-pointer
                ${
                  active
                    ? 'border-accent bg-accent/5 text-accent'
                    : 'border-surface-border text-ink-muted hover:border-ink-subtle'
                }`}
            >
              <Icon className="w-6 h-6" aria-hidden />
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-ink mb-1.5">
          标题 <span className="text-brand">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="给这条内容起个名字"
          className="w-full rounded-xl border border-surface-border px-4 py-2.5 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none transition-colors duration-200"
        />
      </div>

      {/* Content area by type */}
      {type === 'text' ? (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="text" className="block text-sm font-medium text-ink">
              文本内容 <span className="text-brand">*</span>
            </label>
            <span className="text-xs text-ink-subtle">
              {text.length} / {MAX_SIZE.text / 1024} KB
            </span>
          </div>
          <textarea
            id="text"
            value={text}
            maxLength={MAX_SIZE.text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="写下你想分享的文字……"
            className="w-full rounded-xl border border-surface-border px-4 py-3 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none transition-colors duration-200 resize-y"
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            选择文件 <span className="text-brand">*</span>
            <span className="ml-2 text-xs font-normal text-ink-subtle">{limitLabel}</span>
          </label>
          <label className="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-surface-border text-ink-subtle hover:border-accent hover:text-accent transition-colors duration-200 cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={onFileChange}
              className="hidden"
            />
            {file ? (
              <span className="text-ink font-medium">{file.name}</span>
            ) : (
              <span>点击选择{type === 'video' ? '视频' : type === 'image' ? '图片' : '音频'}文件</span>
            )}
            {file ? (
              <span className="text-xs text-ink-subtle">{formatSize(file.size)}</span>
            ) : null}
          </label>
        </div>
      )}

      {error ? (
        <p className="text-sm text-brand-dark bg-brand/5 border border-brand/20 rounded-lg px-3 py-2">
          {error}
        </p>
      ) : null}

      {done ? (
        <p className="inline-flex items-center gap-2 text-sm text-accent-dark">
          <CheckCircle2 className="w-4 h-4" aria-hidden /> 上传成功，正在跳转……
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-full bg-accent text-white font-medium hover:bg-accent-dark disabled:opacity-60 transition-colors duration-200 cursor-pointer"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> 上传中……
          </>
        ) : (
          '发布内容'
        )}
      </button>
    </form>
  );
}
