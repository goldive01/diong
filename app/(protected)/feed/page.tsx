import Link from "next/link";
import { requireCompletedProfile } from "@/src/lib/auth";
import { listFeedPosts } from "@/src/lib/social/post-data";
import { FEED_PAGE_SIZE } from "@/src/lib/social/post-validation";
import { PostComposer } from "@/src/components/social/post-composer";
import { PostFeed } from "@/src/components/social/post-feed";
import { loadMoreFeed } from "@/app/(protected)/feed/actions";

export const metadata = {
  title: "Feed",
};

export default async function FeedPage() {
  const { supabase } = await requireCompletedProfile();
  const page = await listFeedPosts(supabase, { limit: FEED_PAGE_SIZE });

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Feed
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Share your progress
        </h1>
        <p className="mt-2 leading-7 text-[#5f6962]">
          A calm space for progress, reflections, questions and useful resources
          from you and the people you follow.
        </p>
        <Link
          href="/saved"
          className="mt-3 inline-block text-sm font-semibold text-[#59654a] hover:underline"
        >
          Saved posts
        </Link>
      </header>

      <section
        aria-label="Share something"
        className="rounded-3xl border border-[#ded7c9] bg-white p-5 sm:p-6"
      >
        <PostComposer />
      </section>

      <section aria-label="Your feed" className="mt-8">
        <PostFeed
          initialPosts={page.posts}
          initialCursor={page.nextCursor}
          loadMore={loadMoreFeed}
          emptyText="Your feed is quiet for now. Share an update, or follow people whose progress you want to see."
        />
      </section>
    </main>
  );
}
