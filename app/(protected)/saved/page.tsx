import Link from "next/link";
import { requireCompletedProfile } from "@/src/lib/auth";
import { listBookmarks } from "@/src/lib/social/post-data";
import { FEED_PAGE_SIZE } from "@/src/lib/social/post-validation";
import { PostFeed } from "@/src/components/social/post-feed";
import { loadMoreBookmarks } from "@/app/(protected)/saved/actions";

export const metadata = {
  title: "Saved posts",
};

export default async function SavedPage() {
  const { supabase } = await requireCompletedProfile();
  const page = await listBookmarks(supabase, { limit: FEED_PAGE_SIZE });

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/feed"
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to feed
      </Link>

      <header className="mb-6 mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">Saved posts</h1>
        <p className="mt-2 leading-7 text-[#5f6962]">
          Posts you saved for later. Only you can see this list.
        </p>
      </header>

      <PostFeed
        initialPosts={page.posts}
        initialCursor={page.nextCursor}
        loadMore={loadMoreBookmarks}
        emptyText="No saved posts yet."
      />
    </main>
  );
}
