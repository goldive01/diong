"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  initialToggleState,
  type ToggleActionState,
} from "@/src/lib/social/post-form-state";
import { commentLabel, likeLabel } from "@/src/lib/social/post-labels";
import { toggleBookmark, toggleLike } from "@/app/(protected)/posts/actions";
import type { FeedPost } from "@/src/lib/social/post-data";

type ToggleAction = (
  state: ToggleActionState,
) => Promise<ToggleActionState>;

// Like, comment and bookmark controls for one post. Each toggle keeps its own
// optimistic state via useActionState so it responds immediately; the server
// action revalidates the affected paths in the background. The parent re-keys
// this component when the server-rendered post changes.
export function PostEngagementBar({
  post,
  showCommentLink = true,
}: {
  post: FeedPost;
  showCommentLink?: boolean;
}) {
  const likeAction: ToggleAction = toggleLike.bind(null, post.id);
  const bookmarkAction: ToggleAction = toggleBookmark.bind(null, post.id);

  const [likeState, likeFormAction, likePending] = useActionState(
    (state: ToggleActionState) => likeAction(state),
    initialToggleState(post.viewerLiked, post.likeCount),
  );
  const [bookmarkState, bookmarkFormAction, bookmarkPending] = useActionState(
    (state: ToggleActionState) => bookmarkAction(state),
    initialToggleState(post.viewerBookmarked, 0),
  );

  const error =
    (likeState.status === "error" && likeState.message) ||
    (bookmarkState.status === "error" && bookmarkState.message) ||
    "";

  return (
    <div className="mt-4 border-t border-[#ece7de] pt-3">
      <div className="flex flex-wrap items-center gap-1">
        <form action={likeFormAction}>
          <button
            type="submit"
            disabled={likePending}
            aria-pressed={likeState.active}
            aria-label={
              likeState.active
                ? `Remove your like from ${post.authorDisplayName}'s post`
                : `Like ${post.authorDisplayName}'s post`
            }
            className={`flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40 ${
              likeState.active
                ? "bg-[#eef2e5] text-[#42512a]"
                : "text-[#57615a] hover:bg-[#f2efe7]"
            }`}
          >
            <span aria-hidden="true">{likeState.active ? "★" : "☆"}</span>
            {likeLabel(likeState.count)}
          </button>
        </form>

        {showCommentLink ? (
          <Link
            href={`/posts/${post.id}#comments`}
            className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-[#57615a] transition hover:bg-[#f2efe7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
          >
            <span aria-hidden="true">💬</span>
            {commentLabel(post.commentCount)}
          </Link>
        ) : (
          <span className="flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-[#57615a]">
            <span aria-hidden="true">💬</span>
            {commentLabel(post.commentCount)}
          </span>
        )}

        <form action={bookmarkFormAction} className="ml-auto">
          <button
            type="submit"
            disabled={bookmarkPending}
            aria-pressed={bookmarkState.active}
            aria-label={
              bookmarkState.active
                ? "Remove this post from your saved posts"
                : "Save this post privately"
            }
            className={`flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40 ${
              bookmarkState.active
                ? "bg-[#eef2e5] text-[#42512a]"
                : "text-[#57615a] hover:bg-[#f2efe7]"
            }`}
          >
            <span aria-hidden="true">{bookmarkState.active ? "🔖" : "📑"}</span>
            {bookmarkState.active ? "Saved" : "Save"}
          </button>
        </form>
      </div>

      {error && (
        <p role="alert" className="mt-2 px-3 text-sm text-[#9b3f37]">
          {error}
        </p>
      )}
    </div>
  );
}
