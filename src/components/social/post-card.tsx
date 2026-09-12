"use client";

import Link from "next/link";
import type { FeedPost } from "@/src/lib/social/post-data";
import {
  postTypeLabel,
  visibilityShort,
} from "@/src/lib/social/post-labels";
import { PostTimestamp } from "@/src/components/social/post-timestamp";
import { PostEngagementBar } from "@/src/components/social/post-engagement-bar";
import { PostOwnerActions } from "@/src/components/social/post-owner-actions";
import { ReportButton } from "@/src/components/social/report-button";
import { createReportAction } from "@/app/(protected)/reports/actions";

const PREVIEW_CHARS = 600;

// One post. In the feed the body is previewed with a "Read full post" link when
// long; on the detail page (`detailed`) the whole body is shown and there is no
// self-link. Calm and uncluttered: no view counts, no popularity score.
export function PostCard({
  post,
  detailed = false,
  communityBadge,
}: {
  post: FeedPost;
  detailed?: boolean;
  /** The community this post belongs to, if any — shown as a small tag so a
   * community post is recognisable wherever it is rendered (feed, profile,
   * Discover, its own community page). */
  communityBadge?: { slug: string; name: string } | null;
}) {
  const isLong = !detailed && post.body.length > PREVIEW_CHARS;
  const shown = isLong
    ? `${post.body.slice(0, PREVIEW_CHARS).trimEnd()}…`
    : post.body;

  return (
    <article className="rounded-3xl border border-[#ded7c9] bg-white p-5 sm:p-6">
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <Link
          href={`/profile/${post.authorUsername}`}
          className="font-semibold text-[#1d2420] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
        >
          {post.authorDisplayName}
        </Link>
        <Link
          href={`/profile/${post.authorUsername}`}
          className="text-sm text-[#657052] hover:underline"
        >
          @{post.authorUsername}
        </Link>
        <span aria-hidden="true" className="text-[#c3bdae]">
          ·
        </span>
        <PostTimestamp
          iso={post.createdAt}
          edited={Boolean(post.editedAt)}
          className="text-sm text-[#7a8378]"
        />
      </header>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-full bg-[#eef2e5] px-2.5 py-1 text-[#4c592f]">
          {postTypeLabel(post.postType)}
        </span>
        {post.visibility !== "public" && (
          <span className="rounded-full bg-[#f1ede3] px-2.5 py-1 text-[#6b6350]">
            {visibilityShort(post.visibility)}
          </span>
        )}
        {communityBadge && (
          <Link
            href={`/communities/${communityBadge.slug}`}
            className="rounded-full bg-[#eef2e5] px-2.5 py-1 text-[#42512a] hover:underline"
          >
            {communityBadge.name}
          </Link>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-[#38423b]">
        {shown}
      </p>

      {isLong && (
        <Link
          href={`/posts/${post.id}`}
          className="mt-1 inline-block text-sm font-semibold text-[#59654a] hover:underline"
        >
          Read full post →
        </Link>
      )}

      {!detailed && (
        <Link
          href={`/posts/${post.id}`}
          className="mt-3 block text-sm font-semibold text-[#59654a] hover:underline"
        >
          Open post
        </Link>
      )}

      <PostEngagementBar post={post} showCommentLink={!detailed} />

      {post.isAuthor && <PostOwnerActions postId={post.id} />}

      {!post.isAuthor && (
        <div className="mt-2">
          <ReportButton
            action={createReportAction.bind(null, "post", post.id, null)}
          />
        </div>
      )}
    </article>
  );
}
