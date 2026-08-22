import { Video, FileText, Music, Image as ImageIcon } from 'lucide-react';
import type { ContentType } from '@/lib/types';

export function TypeIcon({
  type,
  className = 'w-5 h-5',
}: {
  type: ContentType;
  className?: string;
}) {
  if (type === 'video') return <Video className={className} aria-hidden />;
  if (type === 'audio') return <Music className={className} aria-hidden />;
  if (type === 'image') return <ImageIcon className={className} aria-hidden />;
  return <FileText className={className} aria-hidden />;
}
