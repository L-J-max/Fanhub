export type ContentType = 'video' | 'text' | 'audio' | 'image';

/** Full content row as stored in the database. */
export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  text_body: string | null;
  file_path: string | null;
  mime: string | null;
  size: number | null;
  like_count: number;
  user_id: string | null;
  created_at: string;
}

/** Lightweight item returned in list responses (no full text, no internal path). */
export interface ApiContent {
  id: string;
  type: ContentType;
  title: string;
  snippet: string | null;
  mime: string | null;
  size: number | null;
  like_count: number;
  created_at: string;
  /** Whether the current viewer owns this item (controls delete visibility). */
  mine?: boolean;
  /** Whether the current viewer has liked this item (logged-in only). */
  likedByMe?: boolean;
}

/** The currently authenticated user (lightweight). */
export interface ApiUser {
  username: string;
  role?: string;
  avatarUrl?: string | null;
}

/** Full detail item (text body, or media file url). */
export interface ApiContentDetail {
  id: string;
  type: ContentType;
  title: string;
  text_body: string | null;
  fileUrl: string | null;
  mime: string | null;
  size: number | null;
  like_count: number;
  created_at: string;
}

export interface ContentListResponse {
  items: ApiContent[];
  nextOffset: number | null;
}

export interface LikeResponse {
  likeCount: number;
}
