import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BookmarkPostRow,
  Database,
  FeedPostRow,
  PostCommentRow,
  PostEngagementRow,
  PostType,
  PostVisibility,
} from "@/src/types/database";
import {
  FEED_PAGE_SIZE,
  encodeFeedCursor,
  type FeedCursor,
} from "./post-validation";

// Typed reads for social content. Every function takes a
// SupabaseClient<Database> (the existing Diong data-module convention) and wraps
// a SECURITY DEFINER RPC that already applies the full visibility + block model.
// Reads never throw: a failure is logged server-side and yields an empty result
// so a transient database problem cannot break a page, and no raw database text
// reaches the browser.

export type FeedPost = {
  id: number;
  authorId: string;
  postType: PostType;
  body: string;
  visibility: PostVisibility;
  createdAt: string;
  editedAt: string | null;
  authorUsername: string;
  authorDisplayName: string;
  likeCount: number;
  commentCount: number;
  viewerLiked: boolean;
  viewerBookmarked: boolean;
  isAuthor: boolean;
};

export type FeedPage = {
  posts: FeedPost[];
  /** Opaque cursor for the next page, or null when the last page was reached. */
  nextCursor: string | null;
};

// Exported (additive, Pass 3) so Discover / Search can reuse the exact
// FeedPostRow → FeedPost mapping instead of duplicating it — both
// list_discover_posts() and search_posts() return the identical row shape.
export function mapPost(row: FeedPostRow): FeedPost {
  return {
    id: row.id,
    authorId: row.user_id,
    postType: row.post_type,
    body: row.body,
    visibility: row.visibility,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    authorUsername: row.author_username,
    authorDisplayName: row.author_display_name,
    likeCount: row.like_count ?? 0,
    commentCount: row.comment_count ?? 0,
    viewerLiked: Boolean(row.viewer_liked),
    viewerBookmarked: Boolean(row.viewer_bookmarked),
    isAuthor: Boolean(row.is_author),
  };
}

export type ListOptions = {
  cursor?: FeedCursor | null;
  limit?: number;
};

/**
 * One page of the viewer's chronological feed: their own posts plus public and
 * followers-only posts by accounts they follow, newest first, block filtered.
 */
export async function listFeedPosts(
  supabase: SupabaseClient<Database>,
  options: ListOptions = {},
): Promise<FeedPage> {
  const limit = options.limit ?? FEED_PAGE_SIZE;
  try {
    const { data, error } = await supabase.rpc("list_feed", {
      p_before_created_at: options.cursor?.beforeCreatedAt ?? null,
      p_before_id: options.cursor?.beforeId ?? null,
      p_limit: limit,
    });
    if (error) {
      console.error("Unable to load feed:", error.message);
      return { posts: [], nextCursor: null };
    }
    return toPage(data ?? [], limit);
  } catch (cause) {
    console.error(
      "Unable to load feed:",
      cause instanceof Error ? cause.message : cause,
    );
    return { posts: [], nextCursor: null };
  }
}

/** Posts by one author that the viewer is allowed to see, newest first. */
export async function listUserPosts(
  supabase: SupabaseClient<Database>,
  authorId: string,
  options: ListOptions = {},
): Promise<FeedPage> {
  const limit = options.limit ?? FEED_PAGE_SIZE;
  try {
    const { data, error } = await supabase.rpc("list_user_posts", {
      p_author_id: authorId,
      p_before_created_at: options.cursor?.beforeCreatedAt ?? null,
      p_before_id: options.cursor?.beforeId ?? null,
      p_limit: limit,
    });
    if (error) {
      console.error("Unable to load author posts:", error.message);
      return { posts: [], nextCursor: null };
    }
    return toPage(data ?? [], limit);
  } catch (cause) {
    console.error(
      "Unable to load author posts:",
      cause instanceof Error ? cause.message : cause,
    );
    return { posts: [], nextCursor: null };
  }
}

/** The viewer's bookmarked posts, most recently saved first. */
export async function listBookmarks(
  supabase: SupabaseClient<Database>,
  options: { cursor?: { beforeCreatedAt: string; beforePostId: number } | null; limit?: number } = {},
): Promise<FeedPage> {
  const limit = options.limit ?? FEED_PAGE_SIZE;
  try {
    const { data, error } = await supabase.rpc("list_bookmarks", {
      p_before_created_at: options.cursor?.beforeCreatedAt ?? null,
      p_before_post_id: options.cursor?.beforePostId ?? null,
      p_limit: limit,
    });
    if (error) {
      console.error("Unable to load bookmarks:", error.message);
      return { posts: [], nextCursor: null };
    }
    const rows = (data ?? []) as BookmarkPostRow[];
    const posts = rows.map(mapPost);
    const last = rows[rows.length - 1];
    const nextCursor =
      rows.length === limit && last
        ? encodeFeedCursor(last.bookmarked_at, last.id)
        : null;
    return { posts, nextCursor };
  } catch (cause) {
    console.error(
      "Unable to load bookmarks:",
      cause instanceof Error ? cause.message : cause,
    );
    return { posts: [], nextCursor: null };
  }
}

/** One post from the viewer's point of view, or null when it is not visible. */
export async function getPost(
  supabase: SupabaseClient<Database>,
  postId: number,
): Promise<FeedPost | null> {
  if (!Number.isSafeInteger(postId) || postId <= 0) return null;
  try {
    const { data, error } = await supabase.rpc("get_post", {
      p_post_id: postId,
    });
    if (error) {
      console.error("Unable to load post:", error.message);
      return null;
    }
    const row = (data as FeedPostRow[] | null)?.[0];
    return row ? mapPost(row) : null;
  } catch (cause) {
    console.error(
      "Unable to load post:",
      cause instanceof Error ? cause.message : cause,
    );
    return null;
  }
}

export type PostCommentView = {
  id: number;
  parentCommentId: number | null;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  body: string | null;
  createdAt: string;
  editedAt: string | null;
  isDeleted: boolean;
  isAuthor: boolean;
};

export type CommentNode = {
  comment: PostCommentView;
  replies: PostCommentView[];
};

function mapComment(row: PostCommentRow): PostCommentView {
  return {
    id: row.id,
    parentCommentId: row.parent_comment_id,
    authorId: row.user_id,
    authorUsername: row.author_username,
    authorDisplayName: row.author_display_name,
    body: row.body,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    isDeleted: Boolean(row.is_deleted),
    isAuthor: Boolean(row.is_author),
  };
}

/**
 * The comment thread for a visible post: top-level comments each with their
 * single reply level, in the order the RPC returns (oldest first). Returns [] if
 * the post is not visible.
 */
export async function listComments(
  supabase: SupabaseClient<Database>,
  postId: number,
): Promise<CommentNode[]> {
  if (!Number.isSafeInteger(postId) || postId <= 0) return [];
  try {
    const { data, error } = await supabase.rpc("list_post_comments", {
      p_post_id: postId,
    });
    if (error) {
      console.error("Unable to load comments:", error.message);
      return [];
    }
    return buildCommentThread((data ?? []) as PostCommentRow[]);
  } catch (cause) {
    console.error(
      "Unable to load comments:",
      cause instanceof Error ? cause.message : cause,
    );
    return [];
  }
}

/** Group a flat comment list into one reply level. Pure — exported for tests. */
export function buildCommentThread(rows: PostCommentRow[]): CommentNode[] {
  const views = rows.map(mapComment);
  const roots = views.filter((c) => c.parentCommentId === null);
  const repliesByParent = new Map<number, PostCommentView[]>();
  for (const view of views) {
    if (view.parentCommentId === null) continue;
    const list = repliesByParent.get(view.parentCommentId) ?? [];
    list.push(view);
    repliesByParent.set(view.parentCommentId, list);
  }
  return roots.map((comment) => ({
    comment,
    replies: repliesByParent.get(comment.id) ?? [],
  }));
}

/** Fresh engagement counts for a set of post ids the caller already holds. */
export async function getPostEngagement(
  supabase: SupabaseClient<Database>,
  postIds: number[],
): Promise<Map<number, PostEngagementRow>> {
  const ids = postIds.filter((id) => Number.isSafeInteger(id) && id > 0);
  if (ids.length === 0) return new Map();
  try {
    const { data, error } = await supabase.rpc("get_post_engagement", {
      p_post_ids: ids,
    });
    if (error) {
      console.error("Unable to load engagement:", error.message);
      return new Map();
    }
    return new Map(
      ((data ?? []) as PostEngagementRow[]).map((row) => [row.post_id, row]),
    );
  } catch (cause) {
    console.error(
      "Unable to load engagement:",
      cause instanceof Error ? cause.message : cause,
    );
    return new Map();
  }
}

// Exported (additive, Pass 3) — same reasoning as mapPost() above.
export function toPage(rows: FeedPostRow[], limit: number): FeedPage {
  const posts = rows.map(mapPost);
  const last = rows[rows.length - 1];
  const nextCursor =
    rows.length === limit && last
      ? encodeFeedCursor(last.created_at, last.id)
      : null;
  return { posts, nextCursor };
}
