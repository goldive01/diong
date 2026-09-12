import type { FeedPost } from "@/src/lib/social/post-data";
import { PostCard } from "@/src/components/social/post-card";
import { ModerationActionButton } from "@/src/components/communities/moderation-action-button";
import { removePostAction } from "@/app/(protected)/communities/[slug]/moderation/actions";

// One community post in the moderation queue: the existing PostCard (no
// forked post UI) plus a "Remove from community" action. Removing sets
// community_post_links.removed_at only — the underlying Diong post is never
// deleted and stays visible through normal post visibility. See
// docs/COMMUNITIES_MODERATION.md.
export function CommunityModerationPostRow({
  communityId,
  slug,
  post,
}: {
  communityId: number;
  slug: string;
  post: FeedPost;
}) {
  return (
    <div className="rounded-3xl border border-[#ded7c9] bg-[#faf8f3] p-3">
      <PostCard post={post} />
      <div className="mt-2 px-2">
        <ModerationActionButton
          action={removePostAction.bind(null, communityId, slug, post.id)}
          label="Remove from community"
          pendingLabel="Removing…"
          confirmText="Remove this post from the community? The author's post is not deleted."
          destructive
          reasonField
        />
      </div>
    </div>
  );
}
