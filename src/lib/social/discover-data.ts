import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DiscoverPeopleRow } from "@/src/types/database";
import { toPage, type FeedPage } from "./post-data";
import { getOffsetPagination, PAGE_SIZE, type Cursor } from "./pagination";

// Typed reads for Discover. Every function takes a SupabaseClient<Database>
// (the existing Diong data-module convention) and wraps a SECURITY DEFINER
// RPC that already applies the full completed-profile / not-self /
// not-followed / block model (people) or the public-post / block model
// (posts). Reads never throw — a failure is logged and yields an empty page.

export type DiscoverPerson = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  sharedInterestCount: number;
  viewerFollows: boolean;
};

export type DiscoverPeoplePage = {
  people: DiscoverPerson[];
  total: number;
  page: number;
  pageSize: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

function emptyPeoplePage(page: number): DiscoverPeoplePage {
  return {
    people: [],
    total: 0,
    page,
    pageSize: PAGE_SIZE,
    hasPrevious: page > 1,
    hasNext: false,
  };
}

/** One page of "people to discover" for the viewer, ranked by shared interests. */
export async function discoverPeople(
  supabase: SupabaseClient<Database>,
  page: number,
): Promise<DiscoverPeoplePage> {
  const { page: safePage, pageSize, offset } = getOffsetPagination(page);
  try {
    const { data, error } = await supabase.rpc("discover_people", {
      p_limit: pageSize,
      p_offset: offset,
    });
    if (error) {
      console.error("Unable to load discover people:", error.message);
      return emptyPeoplePage(safePage);
    }
    const rows = (data ?? []) as DiscoverPeopleRow[];
    const total = rows[0]?.total_count ?? 0;
    const people: DiscoverPerson[] = rows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      bio: row.bio,
      sharedInterestCount: row.shared_interest_count,
      viewerFollows: row.viewer_follows,
    }));
    return {
      people,
      total,
      page: safePage,
      pageSize,
      hasPrevious: safePage > 1,
      hasNext: offset + people.length < total,
    };
  } catch (cause) {
    console.error(
      "Unable to load discover people:",
      cause instanceof Error ? cause.message : cause,
    );
    return emptyPeoplePage(safePage);
  }
}

export type ListDiscoverPostsOptions = {
  cursor?: Cursor | null;
  limit?: number;
};

/** Recent public posts only, newest first, block filtered. */
export async function listDiscoverPosts(
  supabase: SupabaseClient<Database>,
  options: ListDiscoverPostsOptions = {},
): Promise<FeedPage> {
  const limit = options.limit ?? PAGE_SIZE;
  try {
    const { data, error } = await supabase.rpc("list_discover_posts", {
      p_before_created_at: options.cursor?.beforeCreatedAt ?? null,
      p_before_id: options.cursor?.beforeId ?? null,
      p_limit: limit,
    });
    if (error) {
      console.error("Unable to load discover posts:", error.message);
      return { posts: [], nextCursor: null };
    }
    return toPage(data ?? [], limit);
  } catch (cause) {
    console.error(
      "Unable to load discover posts:",
      cause instanceof Error ? cause.message : cause,
    );
    return { posts: [], nextCursor: null };
  }
}
