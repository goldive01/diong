"use server";

import { requireCompletedProfile } from "@/src/lib/auth";
import { listDiscoverPosts } from "@/src/lib/social/discover-data";
import type { FeedPost } from "@/src/lib/social/post-data";
import { clampLimit, parseCursor } from "@/src/lib/social/pagination";

// Every export in this "use server" module is an async server action.

/** Client "Load more" for the Discover posts section. */
export async function loadMoreDiscoverPosts(
  cursor: string | null,
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const { supabase } = await requireCompletedProfile();
  const page = await listDiscoverPosts(supabase, {
    cursor: parseCursor(cursor),
    limit: clampLimit(undefined),
  });
  return { posts: page.posts, nextCursor: page.nextCursor };
}
