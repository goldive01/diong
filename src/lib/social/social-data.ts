import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SocialProfileRow } from "@/src/types/database";
import {
  FOLLOW_LIST_PAGE_SIZE,
  getPagination,
  isUuid,
} from "./social-validation";

// Typed reads for the social graph. Every function takes a
// SupabaseClient<Database> (the existing Diong data-module convention).
//
// - The follow graph (public.follows) is readable by any signed-in user, so
//   these reads still pass explicit ids and filter on them.
// - "Who has blocked me" is never read directly; block-aware gating for a
//   profile and its lists comes from getSocialProfile(), which calls the
//   SECURITY DEFINER RPC public.get_social_profile().

export type SocialProfile = SocialProfileRow;

export type PersonSummary = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
};

export type FollowListPage = {
  people: PersonSummary[];
  /** Total rows in the underlying follow relation (all pages). */
  total: number;
  page: number;
  pageSize: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

function emptyPage(page: number): FollowListPage {
  return {
    people: [],
    total: 0,
    page,
    pageSize: FOLLOW_LIST_PAGE_SIZE,
    hasPrevious: page > 1,
    hasNext: false,
  };
}

/**
 * The block-aware public profile for `username`, from the caller's point of
 * view. Returns null when the username does not resolve OR the owner has
 * blocked the caller (indistinguishable by design — the page `notFound()`s on
 * either). When the caller has blocked the owner the row is returned with
 * `viewer_blocked: true` and bio / counts nulled.
 */
export async function getSocialProfile(
  supabase: SupabaseClient<Database>,
  username: string,
): Promise<SocialProfile | null> {
  try {
    const { data, error } = await supabase.rpc("get_social_profile", {
      p_username: username,
    });
    if (error) {
      console.error("Unable to load social profile:", error.message);
      return null;
    }
    return data?.[0] ?? null;
  } catch (cause) {
    console.error(
      "Unable to load social profile:",
      cause instanceof Error ? cause.message : cause,
    );
    return null;
  }
}

export type FollowState = {
  /** The caller follows the target. */
  following: boolean;
  /** The caller has blocked the target. */
  blocked: boolean;
};

/**
 * The caller's outgoing relationship to `targetId`. Only reads rows the caller
 * owns or can see (their own follow edge, their own block). It cannot report
 * whether the target has blocked the caller — use getSocialProfile() for that.
 */
export async function getFollowState(
  supabase: SupabaseClient<Database>,
  viewerId: string,
  targetId: string,
): Promise<FollowState> {
  if (!isUuid(viewerId) || !isUuid(targetId) || viewerId === targetId) {
    return { following: false, blocked: false };
  }

  const [followRes, blockRes] = await Promise.all([
    supabase
      .from("follows")
      .select("id")
      .eq("follower_id", viewerId)
      .eq("following_id", targetId)
      .maybeSingle(),
    supabase
      .from("blocks")
      .select("id")
      .eq("blocker_id", viewerId)
      .eq("blocked_id", targetId)
      .maybeSingle(),
  ]);

  if (followRes.error) {
    console.error("Unable to load follow state:", followRes.error.message);
  }
  if (blockRes.error) {
    console.error("Unable to load block state:", blockRes.error.message);
  }

  return {
    following: Boolean(followRes.data),
    blocked: Boolean(blockRes.data),
  };
}

/** Number of accounts following `targetId`. Falls back to 0 on any read error. */
export async function getFollowerCount(
  supabase: SupabaseClient<Database>,
  targetId: string,
): Promise<number> {
  if (!isUuid(targetId)) return 0;
  const { count, error } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", targetId);
  if (error) {
    console.error("Unable to load follower count:", error.message);
    return 0;
  }
  return count ?? 0;
}

/** Number of accounts `targetId` follows. Falls back to 0 on any read error. */
export async function getFollowingCount(
  supabase: SupabaseClient<Database>,
  targetId: string,
): Promise<number> {
  if (!isUuid(targetId)) return 0;
  const { count, error } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("follower_id", targetId);
  if (error) {
    console.error("Unable to load following count:", error.message);
    return 0;
  }
  return count ?? 0;
}

type FollowEdgeColumn = "follower_id" | "following_id";

/**
 * One page of a follow relation. Two queries, no N+1: the follows page, then a
 * single `in(...)` lookup of the profiles on that page. Rows whose profile is
 * missing or not onboarding-complete are dropped from the page (the total still
 * reflects the raw relation).
 */
async function listFollowPage(
  supabase: SupabaseClient<Database>,
  options: {
    matchColumn: FollowEdgeColumn;
    matchId: string;
    peopleColumn: FollowEdgeColumn;
    page: number;
  },
): Promise<FollowListPage> {
  if (!isUuid(options.matchId)) return emptyPage(options.page);

  const { page, pageSize, from } = getPagination(options.page);
  const to = from + pageSize - 1;

  const { data: edges, count, error } = await supabase
    .from("follows")
    .select("follower_id, following_id, id", { count: "exact" })
    .eq(options.matchColumn, options.matchId)
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Unable to load follow list:", error.message);
    return emptyPage(page);
  }

  const rows = edges ?? [];
  const total = count ?? 0;
  const hasNext = from + rows.length < total;

  const ids = rows.map((row) => row[options.peopleColumn]);
  if (ids.length === 0) {
    return {
      people: [],
      total,
      page,
      pageSize,
      hasPrevious: page > 1,
      hasNext,
    };
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio")
    .in("id", ids)
    .eq("onboarding_completed", true);

  if (profileError) {
    console.error(
      "Unable to load follow-list profiles:",
      profileError.message,
    );
  }

  const byId = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );

  const people: PersonSummary[] = ids
    .map((id) => byId.get(id))
    .filter(
      (profile): profile is NonNullable<typeof profile> =>
        Boolean(profile?.username && profile?.display_name),
    )
    .map((profile) => ({
      id: profile.id,
      username: profile.username as string,
      displayName: profile.display_name as string,
      bio: profile.bio,
    }));

  return { people, total, page, pageSize, hasPrevious: page > 1, hasNext };
}

/** People who follow `targetId`, newest follow first, paginated. */
export function listFollowers(
  supabase: SupabaseClient<Database>,
  targetId: string,
  page: number,
): Promise<FollowListPage> {
  return listFollowPage(supabase, {
    matchColumn: "following_id",
    matchId: targetId,
    peopleColumn: "follower_id",
    page,
  });
}

/** People `targetId` follows, newest follow first, paginated. */
export function listFollowing(
  supabase: SupabaseClient<Database>,
  targetId: string,
  page: number,
): Promise<FollowListPage> {
  return listFollowPage(supabase, {
    matchColumn: "follower_id",
    matchId: targetId,
    peopleColumn: "following_id",
    page,
  });
}
