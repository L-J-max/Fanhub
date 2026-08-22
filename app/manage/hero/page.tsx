import { redirect } from 'next/navigation';
import HeroManager from '@/components/HeroManager';
import { getCurrentUser, isAdmin } from '@/lib/auth';

export const metadata = {
  title: '管理首屏轮播 · FanHub',
};

export default async function ManageHeroPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    redirect('/');
  }
  return (
    <div className="max-w-5xl mx-auto">
      <HeroManager />
    </div>
  );
}
