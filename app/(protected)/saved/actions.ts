"use server";

import { requireCompletedProfile } from "@/src/lib/auth";
import { listBookmarks, type FeedPost } from "@/src/lib/social/post-data";
import { clampLimit, parseFeedCursor } from "@/src/lib/social/post-validation";

// Client "Load more" for the private /saved list. The bookmark cursor uses the
// same "<epoch-ms>_<id>" shape as the feed cursor, where the id is the post id
// and the timestamp is when the bookmark was saved.
export async function loadMoreBookmarks(
  cursor: string | null,
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const { supabase } = await requireCompletedProfile();
  const parsed = parseFeedCursor(cursor);
  const page = await listBookmarks(supabase, {
    cursor: parsed
      ? { beforeCreatedAt: parsed.beforeCreatedAt, beforePostId: parsed.beforeId }
      : null,
    limit: clampLimit(undefined),
  });
  return { posts: page.posts, nextCursor: page.nextCursor };
}
