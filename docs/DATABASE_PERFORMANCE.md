# Diong Database Performance — Pass 8, Step 3

This document covers Pass 8 Step 3: an audit of every major read path for
N+1 queries, over-fetching, missing pagination, and missing indexes, plus
the fixes that came out of it. It does not cover deployment or Pass 9
product features, and it does not change product behavior except where a
performance problem required it (see §4).

## 1. Method

Before changing anything, every read path listed in the brief was traced
end to end (page → data-layer function → RPC/query → SQL) via four
read-only audits, cross-checked directly against the migration SQL rather
than taken on faith. The headline finding, stated plainly because it's the
opposite of what a performance audit usually turns up: **this codebase
already has no N+1 queries anywhere in the paths audited.** Every list or
detail screen reads through exactly one (or a small fixed number of)
SECURITY DEFINER RPC calls that already return fully-hydrated rows —
author username/display_name/avatar_path, like/comment counts,
viewer-liked/bookmarked/joined/followed state, and media as a `jsonb`
array — via joins and correlated subqueries inside one SQL statement, not
a JS/TS loop issuing one query per row. This was true for the feed, post
detail, saved posts, profile posts, communities (list, detail, members,
posts), messages (conversation list, conversation detail), notifications,
search, and discover, without exception.

That meant this step's real work was narrower than "find and fix N+1s": it
was confirming that architecture held everywhere (it did), finding the
handful of genuine inefficiencies that don't look like classic N+1s
(unnecessary sequential awaits, one real missing-index gap, one two-round-trip
read that could be one), and fixing those.

## 2. Query-flow map (audited, not before/after in the usual sense)

| Surface | Total Supabase calls | Row hydration | Pagination |
| --- | --- | --- | --- |
| Feed | 1 (`list_feed`) | author identity/avatar, counts, viewer-liked/bookmarked, media — all inline | Keyset `(created_at, id)`, page size 20, RPC-clamped to 20 max |
| Post detail | 3 (`get_post`, `list_comments`, `get_post_community`) — now 2 round trips, see §3 | comments carry author identity/avatar inline; no per-comment lookup | Comments: no incremental pagination, hard `limit 500` in SQL (see §6) |
| Saved posts | 1 (`list_bookmarks`) | same shape as feed | Keyset on `(bookmarked_at, post_id)`, page size 20 |
| Profile posts | 1 (`list_user_posts`) + 1 (`get_interest_names`, see §4) — now concurrent, see §3 | same shape as feed | Keyset `(created_at, id)`, page size 20 |
| Communities list | 2 (`list_my_communities`, `list_discover_communities`, already parallel) | owner/member_count/viewer_role/avatar inline | Offset-based, page size 20 |
| Community detail + posts | 2 (`get_community`, `list_community_posts`) | post author/avatar/media inline | Posts: keyset `(created_at, id)`, page size 20 |
| Community members | 2 (`get_community`, `list_community_members`) | role/avatar inline | Offset-based, page size 20 |
| Conversation list | 1 (`list_conversations`) | other-participant identity/avatar, last message, unread flag, block filter — all inline | Keyset `(last_message_at, id)`, page size 20 |
| Conversation detail | 3 (`get_conversation`, `mark_conversation_read`, `list_messages`) — now 2 round trips, see §3 | sender identity resolved once (`get_conversation`), not per message | Keyset, page size 20 (`MAX_LIMIT` also 20, clamped server-side too) |
| Notifications | 2 (`list_notifications`, `get_unread_notification_count`, already parallel) | actor identity/avatar inline; target resolved via `entity_id`/`target_post_id` in-row | Keyset, page size 20 |
| Search | 3 (`search_people`, `search_posts`, `search_communities`, already parallel) | all viewer-relationship state, counts, avatars inline | Offset-based, page size 20; **now index-backed, see §5** |
| Discover | 3 (`discover_people`, `list_discover_posts`, `list_discover_communities`, already parallel) | same as search | Offset/keyset per section, page size 20 |

Every "page size 20" above is a hard client+server clamp: the app's TS
constant defaults to 20, and every RPC independently re-clamps its own
`p_limit` argument with `least(greatest(coalesce(p_limit, 20), 1), 20)` (or
equivalent), so a manipulated request can't ask for an unbounded page even
if it bypasses the client constant.

## 3. Sequential-await fixes (safe `Promise.all` merges)

Four page-level spots awaited two independent calls back-to-back where
neither result feeds the other — each now runs concurrently, saving one
network round-trip per page load. No result changed shape; only the timing
did.

- **`app/(protected)/posts/[id]/page.tsx`** — `listComments(post.id)` and
  `getPostCommunity(post.id)` both only need `post.id` (already resolved).
- **`app/(protected)/profile/[username]/page.tsx`** — `getInterestNames(social.id)`
  and `listUserPosts(social.id, …)` both only need `social.id`/
  `viewer_blocked` (already resolved). The existing `viewer_blocked`
  short-circuit (skip both entirely) is preserved.
- **`app/(protected)/messages/[conversationId]/page.tsx`** —
  `markConversationRead(conversation.id)` and `listMessages(conversation.id, …)`
  both only need `conversation.id`; marking read doesn't gate or change what
  messages are returned, so there's no ordering dependency between them.
- **`app/(protected)/journal/[id]/edit/page.tsx`** — the entry fetch and the
  three option lists (`listGoalOptions`, `listHabitOptions`,
  `listPrimeAssignmentOptions`) all depend only on `userId` (already
  resolved), not on the entry itself. In the rare case the entry isn't
  found, the three option lists are fetched and then discarded — a
  deliberate, cheap trade for one fewer round-trip in the common case.

**Every other page-level fetch was audited and left alone** — either
already correctly `Promise.all`'d (home, discover, search's 3-way search,
communities list, community moderation's 4-way batch, connections,
notifications, Daily Prime history), or genuinely sequential because one
call needs an id/result only the previous call provides (e.g. resolving a
username to a profile before fetching that profile's posts, or fetching a
community before checking the viewer's role in it).

## 4. `get_interest_names()` — new RPC, one round trip instead of two

`getInterestNames()` (`src/lib/profile-data.ts`, used by `/home` and
`/profile/[username]`) previously did two sequential plain-table reads:
`user_interests` (get the selected interest ids) then `interests` (get
their names) — the one place in the app still using the pre-RPC,
two-step client-query pattern instead of the single-RPC convention every
other read in this app follows.

New migration `202609140001_search_and_profile_read_performance.sql` adds
`public.get_interest_names(p_user_id uuid)`, a `SECURITY DEFINER` RPC that
does the join server-side in one query. `src/lib/profile-data.ts` now calls
it directly.

**This is also a privacy fix, found as a byproduct of the performance
work.** The pre-existing `user_interests` RLS select policy allows reading
any completed-onboarding profile's interest selections, with **no block
check at the database layer** — the app only avoided exposing a blocked
user's interests by skipping the call in TypeScript
(`social.viewer_blocked ? [] : …`), which a direct Supabase API call could
bypass entirely. `get_interest_names()` re-checks both `onboarding_completed`
and `blocked_between()` itself, matching the defense-in-depth pattern every
other RPC in this schema already uses, so the read stays viewer-safe
independent of the caller. The RLS policy and the direct table grants are
untouched (`app/onboarding/actions.ts` still reads `interests` directly for
the onboarding picker, which is unrelated to this per-user read).

## 5. Search index gap — the one real missing-index finding

`search_people`, `search_posts`, and `search_communities` all filter with a
leading-wildcard `ilike '%query%'` — a pattern a plain btree index cannot
accelerate. This was already called out in the repo's own migration
comments as a known, deliberately-deferred V1 trade-off (no external search
service, no full-text index), not an oversight — but "add indexes where
evidence supports them" is exactly this situation, and a `pg_trgm` trigram
index is the standard, lightweight fix for this exact query shape. It is
**not** full-text-search infrastructure: no new column, no ranking change,
no change to any RPC's SQL or the app code that calls it — purely an index
addition that makes the existing queries fast.

The same migration adds:
- `create extension if not exists pg_trgm;`
- GIN trigram indexes on `profiles(username)`, `profiles(display_name)`,
  `profiles(bio)` — each `where onboarding_completed`, matching
  `search_people`'s own filter exactly.
- GIN trigram index on `posts(body)` `where deleted_at is null`, matching
  `search_posts`.
- GIN trigram indexes on `communities(name)`, `communities(slug)`,
  `communities(description)` — each `where is_active`, matching
  `search_communities`.

Each partial predicate mirrors the RPC's own `WHERE` clause exactly so the
query planner can actually use the index (a partial index the query
doesn't structurally match is dead weight, not a speedup).

## 6. Bounded but not further optimized — documented, not changed

- **`list_post_comments()`** returns an entire post's comment thread (all
  top-level comments + one reply level) in one call, capped at a hard SQL
  `limit 500` — bounded, but not incrementally paginated. No evidence any
  post in this app is near that limit; adding real cursor-based comment
  pagination would be a product-behavior change (a "load more comments"
  UI), which is out of scope for a performance step per the brief ("do not
  change product behavior unless required to remove a performance
  problem") — 500 rows in one query is not currently a demonstrated
  problem. Flagged here for whoever revisits this once real usage data
  exists.
- **Two independent pagination-constant modules** — `src/lib/social/pagination.ts`
  (`PAGE_SIZE = 20`, offset-based helpers, used by notifications/discover/search)
  and `src/lib/social/post-validation.ts` (`FEED_PAGE_SIZE = 20`,
  keyset-cursor helpers, used by feed/saved/profile posts) both independently
  define a page size of 20. They're consistent today, but nothing keeps them
  in sync if one is ever tuned — a copy-paste-drift risk, not a live bug.
  Consolidating them would touch many call sites across several passes for a
  purely cosmetic gain, so it was left alone rather than risk an unrelated
  wide-reaching change in a performance-only step.

## 7. Over-fetching / result shape

No `select("*")` over-fetching was found in any RPC or client query touched
by this audit — every RPC's `returns table (...)` already lists only the
columns the UI consumes (no email, no auth identifiers beyond `user_id`
where the UI needs it, no internal moderation metadata leaking into a
public-facing row shape). This was true before this step and remains true;
the new `get_interest_names()` RPC follows the same discipline — it returns
only `name`, nothing else from `interests` or `user_interests`.

## 8. Cache safety

No caching was introduced anywhere in this step. The Pass 8 Step 1 service
worker (`public/sw.js`) still only caches its fixed three static/public
paths (manifest + two icon routes) and was not touched — every read
audited in this step (feed, messages, notifications, search, profiles,
communities) remains fully dynamic, uncached, and re-fetched per request,
which is correct for personalized/authenticated data.

## 9. Tests

No new pure logic was introduced that fits this repo's existing test
convention (pure `src/lib/**` functions only — no Supabase-mocking test
infrastructure exists for RPC-calling code, confirmed absent for every
`*-mutations.ts`/`*-data.ts` file in the repo, and adding one wasn't in
scope for a performance-only step). The `Promise.all` merges and the new
RPC wrapper are thin I/O glue with no meaningful pure logic to assert on
in isolation — the existing 427 tests (unchanged) already cover every pure
pagination/cursor/threading helper this step's changes sit on top of
(`buildCommentThread`, the cursor encode/decode helpers, etc.), and none of
those were modified.

## 10. Manual SQL verification

Run these against the target Supabase project **after** applying the new
migration, before considering this step verified in a live database (this
environment has no live Supabase connection to run them against directly):

```sql
-- 1. Extension installed
select extname from pg_extension where extname = 'pg_trgm';

-- 2. All seven trigram indexes exist
select indexname, tablename from pg_indexes
where indexname like '%_trgm_idx' order by tablename, indexname;

-- 3. Planner actually uses a trigram index for a substring search
--    (expect "Bitmap Index Scan" on the relevant *_trgm_idx in the plan)
explain analyze
select id from public.profiles
where onboarding_completed and username ilike '%ann%';

explain analyze
select id from public.posts
where deleted_at is null and body ilike '%habit%';

explain analyze
select id from public.communities
where is_active and name ilike '%focus%';

-- 4. get_interest_names() returns the caller's own interests
--    (run as an authenticated session / with a viewer JWT set)
select * from public.get_interest_names(auth.uid());

-- 5. get_interest_names() returns another completed profile's interests
--    when unblocked, and nothing when blocked (swap in real ids)
select * from public.get_interest_names('<other-user-uuid>');
-- ...then, after inserting a blocks row between the two accounts in either
-- direction, re-run the same call and confirm it now returns zero rows.

-- 6. Execute privileges are exactly authenticated-only
select has_function_privilege('anon', 'public.get_interest_names(uuid)', 'execute');        -- expect false
select has_function_privilege('authenticated', 'public.get_interest_names(uuid)', 'execute'); -- expect true
```

## 11. Migration

**A new migration was required and has been created — it has NOT been run
against any Supabase project.**

- **Filename**: `supabase/migrations/202609140001_search_and_profile_read_performance.sql`
- **Purpose**: (1) add `pg_trgm`-backed GIN indexes behind the three
  existing ILIKE search RPCs, (2) add `get_interest_names()` to replace a
  two-round-trip client read with one RPC call, closing a latent
  block-bypass privacy gap in the process.
- **Creates**: the `pg_trgm` extension (if not already present); 7 indexes
  (`profiles_username_trgm_idx`, `profiles_display_name_trgm_idx`,
  `profiles_bio_trgm_idx`, `posts_body_trgm_idx`, `communities_name_trgm_idx`,
  `communities_slug_trgm_idx`, `communities_description_trgm_idx`); 1
  function (`get_interest_names(uuid)`).
- **Touches no existing table, column, RPC signature, RLS policy, or
  grant.** Purely additive.
- **Application code depends on it**: yes — `src/lib/profile-data.ts`'s
  `getInterestNames()` now calls the new RPC and will fail (falling back to
  an empty interests list, per its existing error handling — not a hard
  crash) until this migration is applied. The search RPCs and their pages
  work correctly with or without the migration; the trigram indexes only
  change query speed, not query results.
- Apply once, in order, after `202609130002_media_profile_polish.sql`,
  the same way every other migration in this repo is applied (Supabase CLI
  `db push`, or paste into the SQL Editor) — **not done as part of this
  step**, per the Pass 8 Step 3 instructions.
