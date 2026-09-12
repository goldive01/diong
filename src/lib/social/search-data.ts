import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DiscoverPersonRow } from "@/src/types/database";
import { toPage, type FeedPage } from "./post-data";
import { getOffsetPagination, PAGE_SIZE, type Cursor } from "./pagination";
import { parseSearchQuery } from "./search-validation";

// Typed reads for global search. Every function takes a
// SupabaseClient<Database> and wraps a SECURITY DEFINER RPC that already
// applies the completed-profile / not-self / block model (people) or the
// full feed visibility + block model (posts). An invalid (too short) query is
// rejected before any RPC call — no wasted round trip. Reads never throw.

export type SearchPerson = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  viewerFollows: boolean;
};

export type SearchPeoplePage = {
  people: SearchPerson[];
  total: number;
  page: number;
  pageSize: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

function emptyPeoplePage(page: number): SearchPeoplePage {
  return {
    people: [],
    total: 0,
    page,
    pageSize: PAGE_SIZE,
    hasPrevious: page > 1,
    hasNext: false,
  };
}

/** One page of people matching `rawQuery` by username / display name / bio. */
export async function searchPeople(
  supabase: SupabaseClient<Database>,
  rawQuery: string,
  page: number,
): Promise<SearchPeoplePage> {
  const { query, valid } = parseSearchQuery(rawQuery);
  const { page: safePage, pageSize, offset } = getOffsetPagination(page);
  if (!valid) return emptyPeoplePage(safePage);

  try {
    const { data, error } = await supabase.rpc("search_people", {
      p_query: query,
      p_limit: pageSize,
      p_offset: offset,
    });
    if (error) {
      console.error("Unable to search people:", error.message);
      return emptyPeoplePage(safePage);
    }
    const rows = (data ?? []) as DiscoverPersonRow[];
    const total = rows[0]?.total_count ?? 0;
    const people: SearchPerson[] = rows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      bio: row.bio,
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
      "Unable to search people:",
      cause instanceof Error ? cause.message : cause,
    );
    return emptyPeoplePage(safePage);
  }
}

export type SearchPostsOptions = {
  cursor?: Cursor | null;
  limit?: number;
};

/** Posts visible to the viewer whose body matches `rawQuery`, newest first. */
export async function searchPosts(
  supabase: SupabaseClient<Database>,
  rawQuery: string,
  options: SearchPostsOptions = {},
): Promise<FeedPage> {
  const { query, valid } = parseSearchQuery(rawQuery);
  if (!valid) return { posts: [], nextCursor: null };

  const limit = options.limit ?? PAGE_SIZE;
  try {
    const { data, error } = await supabase.rpc("search_posts", {
      p_query: query,
      p_before_created_at: options.cursor?.beforeCreatedAt ?? null,
      p_before_id: options.cursor?.beforeId ?? null,
      p_limit: limit,
    });
    if (error) {
      console.error("Unable to search posts:", error.message);
      return { posts: [], nextCursor: null };
    }
    return toPage(data ?? [], limit);
  } catch (cause) {
    console.error(
      "Unable to search posts:",
      cause instanceof Error ? cause.message : cause,
    );
    return { posts: [], nextCursor: null };
  }
}
