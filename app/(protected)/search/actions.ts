"use server";

import { requireCompletedProfile } from "@/src/lib/auth";
import { searchPosts } from "@/src/lib/social/search-data";
import type { FeedPost } from "@/src/lib/social/post-data";
import { clampLimit, parseCursor } from "@/src/lib/social/pagination";

// Every export in this "use server" module is an async server action.

/** Client "Load more" for the Search posts section, bound with the query. */
export async function loadMoreSearchPosts(
  query: string,
  cursor: string | null,
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const { supabase } = await requireCompletedProfile();
  const page = await searchPosts(supabase, query, {
    cursor: parseCursor(cursor),
    limit: clampLimit(undefined),
  });
  return { posts: page.posts, nextCursor: page.nextCursor };
}
