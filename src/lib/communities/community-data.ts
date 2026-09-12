import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CommunityBanRow,
  CommunityDiscoverRow,
  CommunityMemberRow,
  CommunityModerationReportRow,
  CommunityMyRow,
  CommunityRow,
  CommunitySearchRow,
  Database,
  PostCommunityRow,
} from "@/src/types/database";
import { toPage, type FeedPage } from "@/src/lib/social/post-data";
import { getOffsetPagination, PAGE_SIZE, type Cursor } from "./community-pagination";

// Typed reads for communities. Every function takes a SupabaseClient<Database>
// (the existing Diong data-module convention) and wraps a SECURITY DEFINER
// RPC that already applies the full public-community + membership + block
// model. Reads never throw: a failure is logged server-side and yields an
// empty / null result so a transient database problem cannot break a page.

export type CommunityDetail = {
  id: number;
  slug: string;
  name: string;
  description: string;
  rules: string;
  ownerId: string;
  ownerUsername: string;
  ownerDisplayName: string;
  memberCount: number;
  createdAt: string;
  viewerRole: "owner" | "moderator" | "member" | null;
};

function mapCommunityRow(row: CommunityRow): CommunityDetail {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    rules: row.rules,
    ownerId: row.owner_id,
    ownerUsername: row.owner_username,
    ownerDisplayName: row.owner_display_name,
    memberCount: row.member_count,
    createdAt: row.created_at,
    viewerRole: row.viewer_role,
  };
}

/** One community by slug, or null when missing/inactive. */
export async function getCommunity(
  supabase: SupabaseClient<Database>,
  slug: string,
): Promise<CommunityDetail | null> {
  try {
    const { data, error } = await supabase.rpc("get_community", {
      p_slug: slug,
    });
    if (error) {
      console.error("Unable to load community:", error.message);
      return null;
    }
    const row = (data as CommunityRow[] | null)?.[0];
    return row ? mapCommunityRow(row) : null;
  } catch (cause) {
    console.error(
      "Unable to load community:",
      cause instanceof Error ? cause.message : cause,
    );
    return null;
  }
}

export type CommunitySummary = {
  id: number;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
};

export type MyCommunity = CommunitySummary & {
  viewerRole: "owner" | "moderator" | "member";
};

export type SearchCommunity = CommunitySummary & { viewerJoined: boolean };

export type CommunityListPage<T> = {
  communities: T[];
  page: number;
  pageSize: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

function emptyListPage<T>(page: number): CommunityListPage<T> {
  return {
    communities: [],
    page,
    pageSize: PAGE_SIZE,
    hasPrevious: page > 1,
    hasNext: false,
  };
}

/** Communities the viewer has joined, alphabetical by name. */
export async function listMyCommunities(
  supabase: SupabaseClient<Database>,
  page: number,
): Promise<CommunityListPage<MyCommunity>> {
  const { page: safePage, pageSize, offset } = getOffsetPagination(page);
  try {
    const { data, error } = await supabase.rpc("list_my_communities", {
      p_limit: pageSize,
      p_offset: offset,
    });
    if (error) {
      console.error("Unable to load your communities:", error.message);
      return emptyListPage(safePage);
    }
    const rows = (data ?? []) as CommunityMyRow[];
    const total = rows[0]?.total_count ?? 0;
    const communities: MyCommunity[] = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      memberCount: row.member_count,
      viewerRole: row.viewer_role,
    }));
    return {
      communities,
      page: safePage,
      pageSize,
      hasPrevious: safePage > 1,
      hasNext: offset + communities.length < total,
    };
  } catch (cause) {
    console.error(
      "Unable to load your communities:",
      cause instanceof Error ? cause.message : cause,
    );
    return emptyListPage(safePage);
  }
}

/** Active communities the viewer has not joined, newest first. */
export async function listDiscoverCommunities(
  supabase: SupabaseClient<Database>,
  page: number,
  limit: number = PAGE_SIZE,
): Promise<CommunityListPage<CommunitySummary>> {
  const { page: safePage, pageSize, offset } = getOffsetPagination(page, limit);
  try {
    const { data, error } = await supabase.rpc("list_discover_communities", {
      p_limit: pageSize,
      p_offset: offset,
    });
    if (error) {
      console.error("Unable to load communities to discover:", error.message);
      return emptyListPage(safePage);
    }
    const rows = (data ?? []) as CommunityDiscoverRow[];
    const total = rows[0]?.total_count ?? 0;
    const communities: CommunitySummary[] = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      memberCount: row.member_count,
    }));
    return {
      communities,
      page: safePage,
      pageSize,
      hasPrevious: safePage > 1,
      hasNext: offset + communities.length < total,
    };
  } catch (cause) {
    console.error(
      "Unable to load communities to discover:",
      cause instanceof Error ? cause.message : cause,
    );
    return emptyListPage(safePage);
  }
}

/** Active communities matching a query by name / slug / description. */
export async function searchCommunities(
  supabase: SupabaseClient<Database>,
  query: string,
  page: number,
): Promise<CommunityListPage<SearchCommunity>> {
  const { page: safePage, pageSize, offset } = getOffsetPagination(page);
  try {
    const { data, error } = await supabase.rpc("search_communities", {
      p_query: query,
      p_limit: pageSize,
      p_offset: offset,
    });
    if (error) {
      console.error("Unable to search communities:", error.message);
      return emptyListPage(safePage);
    }
    const rows = (data ?? []) as CommunitySearchRow[];
    const total = rows[0]?.total_count ?? 0;
    const communities: SearchCommunity[] = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      memberCount: row.member_count,
      viewerJoined: row.viewer_joined,
    }));
    return {
      communities,
      page: safePage,
      pageSize,
      hasPrevious: safePage > 1,
      hasNext: offset + communities.length < total,
    };
  } catch (cause) {
    console.error(
      "Unable to search communities:",
      cause instanceof Error ? cause.message : cause,
    );
    return emptyListPage(safePage);
  }
}

export type CommunityMember = {
  userId: string;
  username: string;
  displayName: string;
  role: "owner" | "moderator" | "member";
  joinedAt: string;
};

export type CommunityMemberPage = {
  members: CommunityMember[];
  page: number;
  pageSize: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

/** Members of a community, owner first then moderators then members. */
export async function listCommunityMembers(
  supabase: SupabaseClient<Database>,
  communityId: number,
  page: number,
): Promise<CommunityMemberPage> {
  const { page: safePage, pageSize, offset } = getOffsetPagination(page);
  const empty: CommunityMemberPage = {
    members: [],
    page: safePage,
    pageSize,
    hasPrevious: safePage > 1,
    hasNext: false,
  };
  try {
    const { data, error } = await supabase.rpc("list_community_members", {
      p_community_id: communityId,
      p_limit: pageSize,
      p_offset: offset,
    });
    if (error) {
      console.error("Unable to load community members:", error.message);
      return empty;
    }
    const rows = (data ?? []) as CommunityMemberRow[];
    const total = rows[0]?.total_count ?? 0;
    const members: CommunityMember[] = rows.map((row) => ({
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
      joinedAt: row.joined_at,
    }));
    return {
      members,
      page: safePage,
      pageSize,
      hasPrevious: safePage > 1,
      hasNext: offset + members.length < total,
    };
  } catch (cause) {
    console.error(
      "Unable to load community members:",
      cause instanceof Error ? cause.message : cause,
    );
    return empty;
  }
}

export type ListCommunityPostsOptions = {
  cursor?: Cursor | null;
  limit?: number;
};

/**
 * Posts in a community, newest first. Returns the same FeedPost shape as
 * listFeedPosts() — mapPost()/toPage() are reused unchanged so PostFeed /
 * PostCard render community posts with no new post UI.
 */
export async function listCommunityPosts(
  supabase: SupabaseClient<Database>,
  communityId: number,
  options: ListCommunityPostsOptions = {},
): Promise<FeedPage> {
  const limit = options.limit ?? PAGE_SIZE;
  try {
    const { data, error } = await supabase.rpc("list_community_posts", {
      p_community_id: communityId,
      p_before_created_at: options.cursor?.beforeCreatedAt ?? null,
      p_before_id: options.cursor?.beforeId ?? null,
      p_limit: limit,
    });
    if (error) {
      console.error("Unable to load community posts:", error.message);
      return { posts: [], nextCursor: null };
    }
    return toPage(data ?? [], limit);
  } catch (cause) {
    console.error(
      "Unable to load community posts:",
      cause instanceof Error ? cause.message : cause,
    );
    return { posts: [], nextCursor: null };
  }
}

export type PostCommunityBadge = { slug: string; name: string };

/**
 * The (at most one) live community a post belongs to, or null. Purely
 * additive — lets a post rendered outside its community's own page (e.g.
 * /posts/[id], the main feed, Discover) still show which community it
 * belongs to, without changing list_feed() / get_post() / list_user_posts()
 * / list_discover_posts() / search_posts()'s row shape.
 */
export async function getPostCommunity(
  supabase: SupabaseClient<Database>,
  postId: number,
): Promise<PostCommunityBadge | null> {
  try {
    const { data, error } = await supabase.rpc("get_post_community", {
      p_post_id: postId,
    });
    if (error) {
      console.error("Unable to load post community:", error.message);
      return null;
    }
    const row = (data as PostCommunityRow[] | null)?.[0];
    return row ? { slug: row.slug, name: row.name } : null;
  } catch (cause) {
    console.error(
      "Unable to load post community:",
      cause instanceof Error ? cause.message : cause,
    );
    return null;
  }
}

export type CommunityBanEntry = {
  userId: string;
  username: string;
  displayName: string;
  reason: string | null;
  createdAt: string;
};

/** Banned users for a community (owner/moderator only) — lets a moderator
 * find who to unban. */
export async function listCommunityBans(
  supabase: SupabaseClient<Database>,
  communityId: number,
): Promise<CommunityBanEntry[]> {
  try {
    const { data, error } = await supabase.rpc("list_community_bans", {
      p_community_id: communityId,
    });
    if (error) {
      console.error("Unable to load community bans:", error.message);
      return [];
    }
    return ((data ?? []) as CommunityBanRow[]).map((row) => ({
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
      reason: row.reason,
      createdAt: row.created_at,
    }));
  } catch (cause) {
    console.error(
      "Unable to load community bans:",
      cause instanceof Error ? cause.message : cause,
    );
    return [];
  }
}

export type CommunityModerationReport = {
  id: number;
  targetType: CommunityModerationReportRow["target_type"];
  targetId: number;
  reason: CommunityModerationReportRow["reason"];
  details: string | null;
  status: CommunityModerationReportRow["status"];
  createdAt: string;
};

/**
 * Reports connected to one community (owner/moderator only). Never includes
 * reporter identity — the RPC itself does not select reporter_id.
 */
export async function listCommunityModerationReports(
  supabase: SupabaseClient<Database>,
  communityId: number,
): Promise<CommunityModerationReport[]> {
  try {
    const { data, error } = await supabase.rpc(
      "list_community_moderation_reports",
      { p_community_id: communityId },
    );
    if (error) {
      console.error("Unable to load community reports:", error.message);
      return [];
    }
    return ((data ?? []) as CommunityModerationReportRow[]).map((row) => ({
      id: row.id,
      targetType: row.target_type,
      targetId: row.target_id,
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.created_at,
    }));
  } catch (cause) {
    console.error(
      "Unable to load community reports:",
      cause instanceof Error ? cause.message : cause,
    );
    return [];
  }
}

