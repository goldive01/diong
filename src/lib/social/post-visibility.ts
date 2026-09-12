// Pure visibility resolution — a faithful mirror of public.viewer_can_see_post()
// and the "Read visible posts" RLS policy.
//
// The DATABASE is authoritative. This function is used only as a defence-in-depth
// filter over rows the RPCs already scoped, and as documentation of the model.
// Never rely on it as the sole gate.

import type { PostVisibility } from "@/src/types/database";

export type PostVisibilityContext = {
  /** The signed-in viewer. */
  viewerId: string;
  /** The post's author. */
  authorId: string;
  visibility: PostVisibility;
  /** The post has been soft-deleted. */
  deleted?: boolean;
  /** The viewer currently follows the author. */
  viewerFollowsAuthor?: boolean;
  /** A block exists in either direction between viewer and author. */
  blockedBetween?: boolean;
};

/**
 * Can `viewerId` see this post?
 *
 *  - a deleted post is visible to nobody;
 *  - the author always sees their own live post;
 *  - a block in either direction hides the post from the other party;
 *  - public: any viewer with no block;
 *  - followers: the author's current followers, no block;
 *  - private: the author alone.
 */
export function canViewPost(context: PostVisibilityContext): boolean {
  const {
    viewerId,
    authorId,
    visibility,
    deleted = false,
    viewerFollowsAuthor = false,
    blockedBetween = false,
  } = context;

  if (deleted) return false;
  if (!viewerId || !authorId) return false;
  if (viewerId === authorId) return true;
  if (blockedBetween) return false;

  if (visibility === "public") return true;
  if (visibility === "followers") return viewerFollowsAuthor;
  return false; // private
}
