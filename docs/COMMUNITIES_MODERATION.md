# Diong Communities & Moderation — Social Network Pass 5

Pass 5 adds public topic communities on top of the Pass 1 follow / block
graph, the Pass 2 posts/comments/likes/bookmarks, the Pass 3 notifications /
Discover / Search and the Pass 4 direct-message model: **communities,
membership, owner/moderator/member roles, community posts (reusing existing
Diong posts), community moderation (removal, ban/unban) and a general
reporting system** for posts, comments, profiles, communities and community
posts.

Pass 5 does **not** add private/invite-only communities, ownership transfer,
in-app report review/actioning tooling for platform admins, Goals, Habits,
Journal or an AI Coach. It does not change Daily Prime, Connections, feed
visibility, the Pass 1 follow/block semantics, the Pass 2 post model, or the
Pass 4 direct-message model, and it does not modify any already-applied
migration file.

## What a user can do after Pass 5

- Browse `/communities`: the communities they have joined and active
  communities to discover, each paginated.
- Create a community at `/communities/new` (name, slug, optional description
  and rules) and become its owner automatically.
- Open `/communities/<slug>`, read its description/rules, see its member
  count and owner, and **Join** / **Leave**.
- Share a post into a community they belong to, using the same post types,
  body limits and engagement (like / comment / bookmark) as every other
  Diong post.
- View `/communities/<slug>/members`, a public, role-ordered member list.
- As owner or moderator, use `/communities/<slug>/moderation` to promote /
  demote moderators, remove or ban members, unban a banned user, remove a
  post from the community (without deleting the underlying post), and read
  the community's report queue.
- Report a post, a comment, a profile, a community, or a community post from
  wherever it is rendered, with a reason and optional details.
- See communities in global **Search** and a "Communities to discover"
  section on **Discover**.

## V1 design decisions

- **Communities are public only.** Any authenticated member with a completed
  profile can read an active community, its member list, and its post feed.
  Membership is required only to *post* into a community. Private /
  invite-only communities are deferred past V1.
- **No ownership transfer.** The owner recorded at creation time can never
  leave, and can never be removed, demoted or banned by a moderator. If an
  owner needs to step away from a community, that is an out-of-scope
  operational concern for V1, not a self-service feature.
- **Community posts reuse `public.posts`** rather than forking a second post
  model. A community post is always created with `visibility = 'public'`.
- **Report review/actioning is deferred.** Pass 5 ships report *creation* and
  a *read-only* moderation queue scoped to one community's own reports
  (community + community-post targets). There is no in-app workflow yet for
  changing a report's `status`, and no platform-wide admin report queue
  (post/comment/profile reports outside a community context are stored but
  not yet surfaced anywhere in the app).

## Migration to run

Apply in order against the target Supabase project, after every earlier
migration:

1. `supabase/migrations/202609120003_communities.sql`

It depends on `public.profiles` / `auth.users` (202607190001),
`public.follows` / `public.blocks` / `public.blocked_between`
(202609100002 / 202609100003) and `public.posts` /
`public.viewer_can_see_post` (202609100003). It is a single
`begin … commit` transaction and is **not** idempotent — `create table` /
`create function` (not `create or replace`) fail cleanly if the objects
already exist. Never re-run a migration that already succeeded. Nothing in
this file alters an existing table, function, grant, policy or trigger from
Pass 1–4.

With the Supabase CLI linked:

```bash
supabase db push
```

Or paste the whole file once into the SQL Editor, confirm the project, run
it, and record the filename + date in the deployment log.

No new environment variables. No service-role key is used.

### Exact SQL applied

The migration is purely additive: it **creates** five new tables
(`public.communities`, `public.community_members`,
`public.community_post_links`, `public.community_bans`, `public.reports`),
their indexes, one trigger (`communities_set_updated_at`, reusing the
existing `public.set_updated_at()` function), their RLS, two internal
`SECURITY DEFINER` helper functions (`community_role`,
`is_community_banned`) and twenty client-facing `SECURITY DEFINER` RPCs. No
existing table, function, grant, policy or trigger is altered. The full
statement text is the migration file itself:
`supabase/migrations/202609120003_communities.sql`.

## Schema

### `public.communities`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | Primary key. |
| `owner_id` | `uuid` | `references auth.users(id) on delete cascade`. Always `auth.uid()` at creation time — never a client-supplied column. |
| `slug` | `text` | Unique. Lowercase letters/digits, single hyphens, 3–60 chars (`communities_slug_format`). |
| `name` | `text` | 2–80 characters after trimming (`communities_name_length`). |
| `description` | `text` | Default `''`, ≤ 2000 characters. |
| `rules` | `text` | Default `''`, ≤ 5000 characters. |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` maintained by the `communities_set_updated_at` trigger. |
| `is_active` | `boolean` | Default `true`. No soft-delete/deactivation UI ships in Pass 5; the column exists so a later pass can deactivate a community without a schema change. |

Indexes: `communities_slug_idx` (`slug`); `communities_created_idx`
(`created_at desc, id desc`).

### `public.community_members`

| Column | Type | Notes |
| --- | --- | --- |
| `community_id` | `bigint` | `references public.communities(id) on delete cascade`. |
| `user_id` | `uuid` | `references auth.users(id) on delete cascade`. |
| `role` | `text` | One of `owner` / `moderator` / `member` (`community_members_role_allowed`). |
| `joined_at` | `timestamptz` | Default `now()`. |

Primary key `(community_id, user_id)` — one membership row per user per
community, which also makes `join_community()`'s `on conflict do nothing`
possible. Indexes: `community_members_user_id_idx` (`user_id`, "which
communities is this user in"); `community_members_role_idx`
(`community_id, role`).

### `public.community_post_links`

| Column | Type | Notes |
| --- | --- | --- |
| `community_id` | `bigint` | `references public.communities(id) on delete cascade`. |
| `post_id` | `bigint` | `unique`, `references public.posts(id) on delete cascade` — a post belongs to at most one community. |
| `author_id` | `uuid` | `references auth.users(id) on delete cascade`. Always `auth.uid()` at creation time. |
| `created_at` | `timestamptz` | Default `now()`. |
| `removed_at` / `removed_by` / `removal_reason` | `timestamptz` / `uuid` / `text` | Null until a moderator removes the post *from the community*. `removal_reason` ≤ 500 chars. |

Primary key `(community_id, post_id)`. Index:
`community_post_links_feed_idx` (`community_id, created_at desc`).

### `public.community_bans`

| Column | Type | Notes |
| --- | --- | --- |
| `community_id` | `bigint` | `references public.communities(id) on delete cascade`. |
| `user_id` | `uuid` | `references auth.users(id) on delete cascade`. |
| `banned_by` | `uuid` | `references auth.users(id) on delete set null`. Always `auth.uid()` at ban time. |
| `reason` | `text` | Optional, ≤ 500 characters. |
| `created_at` | `timestamptz` | Default `now()`. |

Primary key `(community_id, user_id)`. Index:
`community_bans_community_user_idx` (`community_id, user_id`). **Distinct
from Diong's global user block (`public.blocks`)** — a community ban is
scoped to one community only and never affects the global follow/block
graph, direct messages, or any other community.

### `public.reports`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | Primary key. |
| `reporter_id` | `uuid` | `references auth.users(id) on delete cascade`. Always `auth.uid()` — never a client-supplied column. |
| `target_type` | `text` | One of `post` / `comment` / `profile` / `community` / `community_post` (`reports_target_type_allowed`). |
| `target_id` | `bigint` | The bigint entity id, for every target type except `profile`. |
| `target_user_id` | `uuid` | `references auth.users(id) on delete cascade`. Set only for `target_type = 'profile'`. |
| `reason` | `text` | One of `spam` / `harassment` / `hate_or_abuse` / `unsafe_content` / `misinformation` / `impersonation` / `other` (`reports_reason_allowed`). |
| `details` | `text` | Optional, ≤ 2000 characters. |
| `status` | `text` | One of `open` / `reviewed` / `actioned` / `dismissed` (`reports_status_allowed`); default `open`. No in-app writer changes `status` past `open` in Pass 5. |
| `created_at` | `timestamptz` | Default `now()`. |

Constraint `reports_target_shape` ties `target_type` to exactly one of
`(target_id, target_user_id)` being set — a profile report uses
`target_user_id` (a `uuid`), every other target type uses `target_id` (a
`bigint`). This is additive to a single-`target_id` design, not a departure
from it, and mirrors the polymorphic-target idea Pass 3's `notifications`
table already uses.

Unique partial index `reports_reporter_target_open_unique_idx` on
`(reporter_id, target_type, coalesce(target_id, -1),
coalesce(target_user_id, '00000000-0000-0000-0000-000000000000'::uuid))
where status = 'open'` — one open report per reporter per exact target at a
time; a reporter may report the same target again once the earlier report
leaves `open`. Indexes: `reports_target_idx` (`target_type, target_id`);
`reports_status_created_idx` (`status, created_at desc`).

## Community creation & owner auto-membership

`create_community(p_name, p_slug, p_description, p_rules)` derives
`owner_id` from `auth.uid()` — never a client-supplied column — validates
name/slug/description/rules length and slug format (re-validating what the
client-side form and `community-validation.ts` already checked), rejects a
duplicate slug (`23505`), and then in one function body:

1. Inserts the `communities` row.
2. Inserts a `community_members` row for the same user with `role = 'owner'`.

Both inserts happen inside the same `plpgsql` function invocation, so a
community is never observable without its owner membership already present.

## Membership: join / leave

- `join_community(p_community_id)` requires a completed profile and an
  active community, rejects a banned caller, and is idempotent
  (`on conflict (community_id, user_id) do nothing`) — clicking Join twice
  is harmless.
- `leave_community(p_community_id)` is a no-op (not an error) for a caller
  who is not a member. **The owner can never leave** — rejected with a
  specific, safe message ("Community owners cannot leave their community.")
  rather than the generic not-available case, since there is no
  ownership-transfer feature to fall back to.

## Roles: owner / moderator / member

`community_members.role` is one of `owner`, `moderator`, `member`, set at
insert time (`owner` by `create_community`, `member` by `join_community`)
and changed only by the promote/demote RPCs below. `community_role(p_community_id, p_user_id)` (an internal `SECURITY DEFINER` helper) resolves the
caller's role, or `null` for a non-member, and is used by every mutation and
moderation RPC to authorize the call — the browser never asserts its own
role.

### Promote / demote moderator

- `promote_community_moderator(p_community_id, p_user_id)` — **owner only**.
  Only succeeds against an existing `member` row (never touches the owner,
  who already holds `'owner'` and is excluded by the `and role = 'member'`
  clause).
- `demote_community_moderator(p_community_id, p_user_id)` — **owner only**.
  Only succeeds against an existing `moderator` row.

### Remove member

`remove_community_member(p_community_id, p_user_id)` — owner **or**
moderator. Neither may ever target the owner (`'The owner cannot be
removed.'`). A moderator may remove only a plain member — never another
moderator; only the owner manages moderators (promote / demote / remove of a
moderator peer requires the owner).

### Ban / unban

- `ban_community_member(p_community_id, p_user_id, p_reason)` — owner or
  moderator, same never-the-owner / moderator-cannot-target-moderator rule
  as `remove_community_member`. Deletes the membership row and inserts a
  `community_bans` row (`banned_by = auth.uid()`, optional reason,
  `on conflict do nothing`).
- `unban_community_member(p_community_id, p_user_id)` — owner or moderator.
  Deletes the ban row only; it does **not** restore membership — the user
  may join again through the normal `join_community` path once unbanned.

Every one of these five functions re-derives the caller's role from
`community_role()` inside the function body (never trusts a client-supplied
role), and every "not a member" case is guarded with `coalesce(role,
'none') not in (...)` — PL/pgSQL's `IF` treats `NULL not in (...)` as false
(branch skipped), so the `coalesce` is what prevents a non-member from
silently bypassing the authorization check.

## Community posts: reuse of existing Diong posts

`create_community_post(p_community_id, p_post_type, p_body)` requires an
active community, no ban, and live membership (re-checked here even though
`join_community` already screens membership, since a ban can be applied
after joining), then in one function body:

1. Inserts a normal `public.posts` row — same `post_type` vocabulary, same
   1–5000 character body limit, always `visibility = 'public'` (there is no
   visibility field on the community composer; a community post is always
   public).
2. Inserts a `community_post_links` row linking that post to the community.

Because it is a genuine `public.posts` row, a community post gets full,
unmodified Diong post behaviour for free: likes, comments (with one reply
level), bookmarks, editing, soft-delete, and normal feed/profile/Discover/
Search visibility rules. `list_community_posts()` returns the identical row
shape as `list_feed()` / `list_discover_posts()` / `search_posts()`, so the
application layer reuses `PostCard` / `PostFeed` unchanged — there is no
forked "community post" UI.

## Community post removal vs. the underlying public post

`remove_community_post(p_community_id, p_post_id, p_reason)` — owner or
moderator only — stamps `removed_at`, `removed_by` and `removal_reason` on
the **`community_post_links` row only**. It never updates or deletes the
underlying `public.posts` row. This means:

- The post disappears from the community's own feed (`list_community_posts()`
  filters `removed_at is null`) and from `get_post_community()` (so a badge
  linking back to the community also disappears).
- The post **remains fully visible** everywhere a normal Diong post is
  visible: the author's own feed, their profile, Discover, Search, and its
  direct `/posts/<id>` link — unless the author separately edits or
  soft-deletes it, or platform-level post moderation (outside Pass 5's
  scope) acts on it.
- The author is never notified that their post was removed from a
  community, and their like/comment/bookmark counts are untouched.

This is a deliberate design choice: community moderation curates what a
community shows, it does not act as platform content moderation over a
member's own posts.

## Reporting

`create_report(p_target_type, p_target_id, p_target_user_id, p_reason,
p_details)` is the single write path for every report target:

- **`post`** — target must currently be visible to the reporter
  (`viewer_can_see_post()`).
- **`comment`** — target must not be deleted and its parent post must be
  visible to the reporter.
- **`profile`** — target is `target_user_id` (a `uuid`), must be a completed
  profile, and cannot be the reporter's own profile.
- **`community`** — target must be an active community.
- **`community_post`** — target must have a live (not-removed) link on an
  active community.

`reporter_id` is always `auth.uid()`. A duplicate open report against the
same exact target **silently succeeds** (`on conflict … do nothing`) — the
reporter never learns whether their report was the first, matching the "the
reporter never learns what moderation will do" policy. All five target
types share one `ReportButton` component
(`src/components/social/report-button.tsx`) and one server action
(`app/(protected)/reports/actions.ts`'s `createReportAction`), wired into
post cards, comment cards, the profile panel, and the community header —
the target is always bound server-side (never a form field), so the browser
can neither choose nor forge what is being reported.

## Community moderation reports

`list_community_moderation_reports(p_community_id)` — owner/moderator only
— returns reports whose target is either the community itself
(`target_type = 'community'`) or one of its (not-removed) community posts
(`target_type = 'community_post'`), newest first, capped at 200 rows. It
**never selects `reporter_id`** — reporter identity is not exposed even to
community moderators, at the database level (the RPC's own `select` list
omits the column entirely, not just the UI).

Report review/actioning (changing `status` away from `open`) has no
in-app UI in Pass 5; the moderation page is read-only for reports. Reports
against a plain `post`/`comment`/`profile` outside of a community context
are stored in the same table but are not yet surfaced in any admin queue —
deferred to a future platform-moderation pass.

## Search integration

`search_communities(p_query, p_limit, p_offset)` — case-insensitive
substring match against `name` / `slug` / `description`, active communities
only, same page-with-total-count shape as `search_people()` /
`search_posts()`. `/search` runs it alongside people and posts (three
independently paginated sections: `peoplePage`, `communitiesPage`, and
post keyset pagination), rendered with the shared `CommunityList` component.
A query shorter than 2 characters returns no rows (mirrors `search_people`'s
minimum-length behaviour).

## Discover integration

`list_discover_communities(p_limit, p_offset)` — active communities the
viewer has not joined and is not banned from, newest first. `/discover`
shows up to 4 as a "Communities to discover" section (with a "See all" link
to `/communities`) alongside the existing people-to-discover and
recent-public-posts sections.

## Global block interaction

Community membership and posting are **not** block-aware — a community is
public, so a member the viewer has blocked (or who has blocked the viewer)
can still be a co-member of the same community; this is unchanged by Pass 5
and considered acceptable for a public-community model. Block-awareness is
applied at the same two points the rest of the app applies it:

- `list_community_members()` filters out any member across a
  `blocked_between()` boundary — a blocked/blocking pair never sees each
  other in a community's member list.
- `list_community_posts()` filters out posts from a blocked/blocking author
  — the same `not blocked_between(...)` clause `list_feed()` /
  `list_discover_posts()` / `search_posts()` already use.

A community-scoped ban (`community_bans`) is a **separate, narrower**
mechanism from the global block graph (`public.blocks`): a community ban
only affects that one community (blocks joining/posting there), never the
global follow/block graph, direct messages, or any other community.

## RLS / security

RLS is enabled on all five new tables with a revoke-first model.

| Table | `authenticated` grant | `select` policy |
| --- | --- | --- |
| `communities` | `SELECT` | `is_active` |
| `community_members` | `SELECT` | community is active |
| `community_post_links` | `SELECT` | `removed_at is null` and community is active |
| `community_bans` | **none** | — no client-readable policy exists at all |
| `reports` | **none** | — no client-readable policy exists at all |

`anon` has no access to any of the five tables. There is **no**
`INSERT`/`UPDATE`/`DELETE` grant on any of them for any client role — every
write goes through a `SECURITY DEFINER` RPC, the same Pass 1–4 model.
`community_bans` and `reports` get no `SELECT` grant at all: every read of
those two tables happens inside a `SECURITY DEFINER` function running as the
function owner (bypassing RLS), exactly how `blocked_between()` reads
`public.blocks` today — this is what keeps a moderator's ban list and a
community's report queue from ever needing a client-readable policy, and
keeps "browse other users' reports" structurally impossible for anyone.

Every `SECURITY DEFINER` function in this migration is `set search_path =
''`, and every table/function reference inside them is schema-qualified
(`public.…` / `auth.users`). Every mutation re-derives the acting user from
`auth.uid()` — the browser cannot supply `owner_id`, `author_id`,
`reporter_id`, `banned_by`, `removed_by`, or a role for any write; roles,
bans, membership and community-post creation are database-authoritative,
re-checked inside the RPC regardless of what the application layer already
filtered client-side. Every error raised uses a fixed, non-leaking message
("Authentication is required.", "This community is not available.", "You
are not authorized to do that.", etc.) — no raw Postgres/constraint text
ever reaches the client. The TypeScript mutation wrappers
(`community-mutations.ts`, `report-mutations.ts`) additionally collapse
every SQLSTATE (`23505` / `42501` / `22023` / `23514` / `23503`) to
`slug_taken` / `not_available` / `invalid` / `unknown` before it reaches a
server action.

Nothing in this migration alters an existing table, function, grant, policy
or trigger — Pass 1–4 RLS is untouched.

## Relevant RPCs

All: `language plpgsql` / `sql`, `security definer`, `set search_path = ''`,
every object schema-qualified, viewer from `auth.uid()`, `revoke all …
from public, anon` then `grant execute … to authenticated`. Reads are
`stable`.

| Function | Purpose |
| --- | --- |
| `community_role(p_community_id, p_user_id)` | Internal helper. The caller's role, or `null` if not a member. `security definer` so RLS policies and RPCs can use it without recursion or an extra client grant on `community_members`. |
| `is_community_banned(p_community_id, p_user_id)` | Internal helper. Whether the user is currently banned from the community. |
| `create_community(p_name, p_slug, p_description, p_rules)` | Creates a community and its owner membership row atomically. |
| `join_community(p_community_id)` | Idempotent join; rejects a banned caller. |
| `leave_community(p_community_id)` | No-op for a non-member; rejects the owner. |
| `create_community_post(p_community_id, p_post_type, p_body)` | Creates a normal `public.posts` row (always public) and links it to the community. |
| `remove_community_post(p_community_id, p_post_id, p_reason)` | Owner/moderator. Stamps the link row only — never touches the underlying post. |
| `promote_community_moderator(p_community_id, p_user_id)` | Owner only. Member → moderator. |
| `demote_community_moderator(p_community_id, p_user_id)` | Owner only. Moderator → member. |
| `remove_community_member(p_community_id, p_user_id)` | Owner/moderator, never the owner, moderator cannot target moderator. |
| `ban_community_member(p_community_id, p_user_id, p_reason)` | Same authorization as remove; deletes membership and records the ban. |
| `unban_community_member(p_community_id, p_user_id)` | Owner/moderator. Deletes the ban only — does not restore membership. |
| `create_report(p_target_type, p_target_id, p_target_user_id, p_reason, p_details)` | The only write path into `reports`. Silently no-ops a duplicate open report against the same target. |
| `get_community(p_slug)` | One community from the viewer's point of view (with `viewer_role`), or no row when missing/inactive. |
| `list_my_communities(p_limit, p_offset)` | Communities the viewer has joined, alphabetical, offset paginated. |
| `list_discover_communities(p_limit, p_offset)` | Active communities the viewer has not joined/is not banned from, newest first, offset paginated. |
| `search_communities(p_query, p_limit, p_offset)` | Case-insensitive name/slug/description match, active only, offset paginated. |
| `list_community_members(p_community_id, p_limit, p_offset)` | Members grouped owner → moderator → member, then join order, block-filtered, offset paginated. |
| `list_community_posts(p_community_id, p_before_created_at, p_before_id, p_limit)` | A community's live posts, newest first, block-filtered, keyset paginated — same row shape as `list_feed()`. |
| `list_community_moderation_reports(p_community_id)` | Owner/moderator. Reports on the community or its community posts; never selects `reporter_id`. |
| `list_community_bans(p_community_id)` | Owner/moderator. Banned users, for the unban flow. |
| `get_post_community(p_post_id)` | The (at most one) live community a post belongs to, or no row — used to render a community badge on `/posts/<id>` and elsewhere. |

## Pagination

Two pagination styles, matching what each list needs:

- **Offset pagination** (`community-pagination.ts`, a fresh, private copy —
  deliberately not reusing `src/lib/social/pagination.ts`, following that
  file's own stated precedent of each pass owning its cursor/offset logic):
  `list_my_communities`, `list_discover_communities`,
  `search_communities`, and `list_community_members` all return a
  `total_count` window column and page via `p_limit` / `p_offset`, page size
  **20** (`PAGE_SIZE` / `MAX_LIMIT`), clamped server-side in both the RPC and
  `clampLimit()`. `parsePageNumber()` parses a `?page=`-style search param
  into a safe 1-based integer, clamped to `MAX_PAGE` (500).
- **Keyset pagination**: `list_community_posts` returns newest-first,
  paginated on `(created_at, id)` — identical shape to `list_feed()` /
  `list_discover_posts()` / `search_posts()`, so `PostFeed`'s existing
  **Load more** wiring is reused unchanged.
  `encodeCommunityPostCursor()` / `parseCommunityPostCursor()` handle the
  cursor string, rejecting anything malformed or out of range (falls back
  to the first page rather than erroring).

## Tests

`src/lib/communities/community-validation.test.ts` — slug normalization,
name/slug/description/rules length and format validation, reserved-slug
rejection.

`src/lib/communities/community-pagination.test.ts` — cursor round-trip,
malformed/out-of-range rejection, array-value handling, `clampLimit` /
`parsePageNumber` / `getOffsetPagination` clamping (mirrors
`src/lib/social/pagination.test.ts` / `src/lib/messages/
message-pagination.test.ts`).

`src/lib/communities/community-labels.test.ts` — role labels, member-count
singular/plural/thousands formatting, safe error-message mapping.

`src/lib/communities/community-vocab.test.ts` — the community-role /
report-target-type / report-reason / report-status controlled vocabularies
and their type guards.

`src/lib/communities/report-validation.test.ts` — reason-option ordering,
reason/details validation, at-max-length acceptance.

## `npm test` result

All 27 test files / 270 tests pass, including the five new Pass 5 test
files.

## `npm run lint` result

Clean — zero errors, zero warnings.

## `npm run build` result

Succeeds. `/communities`, `/communities/new`, `/communities/[slug]`,
`/communities/[slug]/members` and `/communities/[slug]/moderation` are
dynamic (`ƒ`) routes, consistent with every other protected, per-user route.

## Manual browser verification

Two completed-onboarding accounts, **A** and **B**, no existing block
between them.

1. A: `/communities` → **Start a community** → fill in name/slug → submit.
   Redirects to `/communities/<slug>`; A shows as **Owner**; the community
   also now appears under "Communities you joined" on `/communities`.
2. A: use the composer on the community page to share a post. It appears in
   the community's post feed and behaves like any normal post (like,
   comment, bookmark all work).
3. B: `/communities` → find the community under "Discover communities" (or
   via `/search` / `/discover`) → open it → **Join**. B now appears in
   `/communities/<slug>/members`.
4. A: `/communities/<slug>/moderation` → promote B to moderator → confirm B
   appears as Moderator in the members list → demote B back to member.
5. A: promote B to moderator again, then **Remove** B from the moderation
   page. Confirm B is no longer a member and (if B is signed in) B's
   `/communities/<slug>` now shows **Join** again.
6. B: join again, then A **Ban**s B with a reason. Confirm B cannot rejoin
   (Join fails safely) and B appears under "Banned" on the moderation page.
   A **Unban**s B — confirm B can join again via the normal Join flow (does
   not auto-restore membership).
7. A: attempt to leave the community from `/communities/<slug>` — confirm no
   Leave control is offered to the owner (an **Owner** badge shows instead).
8. B (as a member): share a post into the community, then A removes it from
   the moderation page with a reason. Confirm the post disappears from the
   community's feed, but B's own profile/feed and the post's direct
   `/posts/<id>` link still show it normally — the underlying post was not
   deleted.
9. B: use the **Report** control on a post, a comment, A's profile, and the
   community itself, each with a reason. Confirm the response never reveals
   whether the report was new or a duplicate.
10. A: `/communities/<slug>/moderation` → **Reports** section shows the
    community and community-post reports B filed, with no reporter identity
    shown anywhere.
11. `/search?q=<part of the community name>` and `/discover` both surface
    the community.
12. A blocks B (from B's profile) — confirm B disappears from
    `/communities/<slug>/members` for A (and vice versa), while both
    remain members of the community itself (block does not remove
    membership).
13. 375px viewport on `/communities`, `/communities/new`,
    `/communities/<slug>`, `/members` and `/moderation` — single column,
    controls wrap, no horizontal scroll.

## Deferred community features

Not built in Pass 5, and not advertised as available:

- Private / invite-only communities.
- Ownership transfer (an owner can never leave or be replaced in V1).
- In-app report status changes (review / action / dismiss) or a
  platform-wide admin report queue across all report target types.
- Community avatars/banners, pinned posts, community-specific rules
  enforcement beyond the free-text `rules` field, community search filters
  (by size, activity, etc.), and community deactivation/archival UI (the
  `is_active` column exists for a future pass).
- Notifications for community events (new member, post removed, promoted/
  demoted, banned) — none of these currently produce a row in
  `public.notifications`.
