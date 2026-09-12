"use client";

import { useState, useTransition } from "react";
import type { FeedPost } from "@/src/lib/social/post-data";
import { PostCard } from "@/src/components/social/post-card";

type LoadMore = (
  cursor: string | null,
) => Promise<{ posts: FeedPost[]; nextCursor: string | null }>;

// A chronological list of posts with an accessible "Load more" control. The
// first page is server-rendered; later pages are appended via a server action.
// Newest first — there is no engagement ranking.
export function PostFeed({
  initialPosts,
  initialCursor,
  loadMore,
  emptyText,
  communityBadge,
}: {
  initialPosts: FeedPost[];
  initialCursor: string | null;
  loadMore: LoadMore;
  emptyText: string;
  /** Passed through to every PostCard — set when every post in this feed
   * belongs to the same community (e.g. a community's own post feed). */
  communityBadge?: { slug: string; name: string } | null;
}) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onLoadMore() {
    setError("");
    startTransition(async () => {
      try {
        const batch = await loadMore(cursor);
        setPosts((current) => {
          const seen = new Set(current.map((p) => p.id));
          return [...current, ...batch.posts.filter((p) => !seen.has(p.id))];
        });
        setCursor(batch.nextCursor);
      } catch {
        setError("Could not load more posts. Please try again.");
      }
    });
  }

  if (posts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[#d8d1c4] px-4 py-10 text-center text-sm text-[#68716b]">
        {emptyText}
      </p>
    );
  }

  return (
    <div>
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.id}>
            <PostCard post={post} communityBadge={communityBadge} />
          </li>
        ))}
      </ul>

      {cursor && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={pending}
            className="min-h-11 rounded-full border border-[#cfc8bb] px-6 text-sm font-semibold text-[#3e4a41] transition hover:bg-white disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
          >
            {pending ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-center text-sm text-[#9b3f37]">
          {error}
        </p>
      )}
    </div>
  );
}
