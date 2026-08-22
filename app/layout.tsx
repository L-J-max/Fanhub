import type { Metadata } from 'next';
import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import { AuthProvider } from '@/components/AuthProvider';
import PageTransition from '@/components/PageTransition';

export const metadata: Metadata = {
  title: 'FanHub · 粉丝内容分享',
  description: '粉丝上传与浏览视频、文本、音频内容的公开分享平台。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <SiteHeader />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">
            {/* Universal route transition wraps only the page content; the
                header/footer stay static chrome so navigation feels anchored. */}
            <PageTransition>{children}</PageTransition>
          </main>
          <footer className="border-t border-surface-border py-6 text-center text-sm text-ink-subtle">
            FanHub · 粉丝内容分享平台
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
