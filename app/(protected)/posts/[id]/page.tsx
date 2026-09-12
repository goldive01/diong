import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getPost, listComments } from "@/src/lib/social/post-data";
import { getPostCommunity } from "@/src/lib/communities/community-data";
import { PostCard } from "@/src/components/social/post-card";
import { CommentThread } from "@/src/components/social/comment-thread";

export const metadata = {
  title: "Post",
};

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await requireCompletedProfile();
  const { id } = await params;

  const postId = /^\d+$/.test(id) ? Number(id) : Number.NaN;

  // get_post returns no row for a missing / deleted / private / followers-only-
  // not-followed / blocked post — all collapse to a branded 404, with no hint
  // that a hidden post exists.
  const post = await getPost(supabase, postId);
  if (!post) notFound();

  const comments = await listComments(supabase, post.id);
  const communityBadge = await getPostCommunity(supabase, post.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/feed"
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to feed
      </Link>

      <div className="mt-4">
        <PostCard post={post} detailed communityBadge={communityBadge} />
      </div>

      <CommentThread
        postId={post.id}
        nodes={comments}
        liveCommentCount={post.commentCount}
      />
    </main>
  );
}
