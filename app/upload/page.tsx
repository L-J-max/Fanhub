import UploadForm from '@/components/UploadForm';

export const metadata = {
  title: '上传内容 · FanHub',
};

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">上传内容</h1>
        <p className="mt-1 text-ink-muted">
          分享你的视频、图片、文本或音频。发布后任何人都能公开浏览并为它点赞。
        </p>
      </header>
      <div className="rounded-2xl bg-surface border border-surface-border shadow-card p-6">
        <UploadForm />
      </div>
    </div>
  );
}
