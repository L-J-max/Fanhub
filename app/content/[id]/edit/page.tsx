import { notFound, redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import EditContentForm from '@/components/EditContentForm';
import type { ContentItem } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function EditContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rowResult = await getDb().execute({
    sql: 'SELECT * FROM content WHERE id = ?',
    args: [id],
  });
  const row = (rowResult.rows as unknown as ContentItem[])[0];

  if (!row) notFound();

  const me = await getCurrentUser();
  const admin = isAdmin(me);
  const canEdit = admin || (row.user_id ? me?.username === row.user_id : true);
  if (!canEdit) {
    redirect('/');
  }

  return (
    <EditContentForm
      id={row.id}
      initialTitle={row.title}
      initialText={row.text_body}
      isText={row.type === 'text'}
    />
  );
}
