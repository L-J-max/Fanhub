'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Upload, Heart, LogIn, Loader2 } from 'lucide-react';
import ContentFeed from '@/components/ContentFeed';
import { useAuth } from '@/components/AuthProvider';

export default function MePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-ink-muted">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
        <span className="ml-2">加载中……</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div className="rounded-full bg-surface-muted p-4 text-ink-subtle">
          <LogIn className="w-7 h-7" aria-hidden />
        </div>
        <div>
          <p className="font-medium text-ink">请先登录</p>
          <p className="mt-1 text-sm text-ink-muted">登录后即可查看你的作品与喜欢的内容。</p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 font-medium text-white transition-colors duration-200 hover:bg-accent-dark"
        >
          去登录 / 注册
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">我的</h1>
          <p className="mt-1 text-ink-muted">
            欢迎，<span className="font-medium text-ink">{user.username}</span>
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-medium text-white transition-colors duration-200 hover:bg-accent-dark"
        >
          <Upload className="h-4 w-4" aria-hidden />
          发布内容
        </Link>
      </header>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-accent" aria-hidden />
          <h2 className="text-lg font-semibold text-ink">作品</h2>
        </div>
        <ContentFeed
          author={user.username}
          showTabs={false}
          emptyHint="你还没有发布作品，去上传第一条吧。"
        />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-brand" aria-hidden />
          <h2 className="text-lg font-semibold text-ink">喜欢</h2>
        </div>
        <ContentFeed
          likedBy={user.username}
          showTabs={false}
          emptyHint="你还没有点赞任何内容。"
        />
      </section>
    </div>
  );
}
