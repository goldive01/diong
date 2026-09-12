# Diong Notifications, Discover & Search — Social Network Pass 3

Pass 3 closes the loop on top of the Pass 1 follow / block graph and the
Pass 2 posts / feed / comments / likes / bookmarks layer: an action now
produces a notification, and members can find each other and public content
through Discover and Search — all authoritative in the database, all
block-aware, all paginated.

Pass 3 does **not** add direct messages, communities, standalone Goals /
Habits / Journal, an AI Coach, or push notifications. It does not change
Daily Prime, Prime history / reflections, Connections, the Pass 1 social
graph, or Pass 2 post visibility semantics, and it does not modify any
already-applied migration.

## What a user can do after Pass 3

- See a calm, chronological list of their notifications at `/notifications`:
  new followers, likes, comments and replies to their own content.
- See an unread count in the app navigation, open a notification to jump to
  its target (and mark it read in the process), mark one or all notifications
  read.
- Discover people they are not yet following and recent public posts at
  `/discover`.
- Search for people (by username / display name / bio) and posts (by body
  text) they are allowed to see at `/search?q=...`.
- Follow someone directly from a Discover or Search result, through the same
  follow action used everywhere else in the app.

All of this is private to signed-in Diong members. Pass 1 blocking is
authoritative over every part of it — see "Block integration" below.

## Migration to run

Apply in order against the target Supabase project, after every earlier
migration:

1. `supabase/migrations/202609100004_notifications_discover_search.sql`

It depends on `public.profiles` / `public.user_interests` / `auth.users`
(202607190001), `public.follows` / `public.blocks` /
`public.blocked_between()` (202609100002), and `public.posts` /
`public.post_comments` / `public.post_likes` / `public.post_bookmarks` /
`public.viewer_can_see_post()` (202609100003). It is a single
`begin … commit` transaction and is **not** idempotent — `create table` /
`create function` (not `create or replace`) fail cleanly if the objects
already exist. Never re-run a migration that already succeeded.

With the Supabase CLI linked:

```bash
supabase db push
```

Or paste the whole file once into the SQL Editor, confirm the project, run
it, and record the filename + date in the deployment log.

No new environment variables. No service-role key is used.

## Schema

### `public.notifications`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | Primary key. |
| `user_id` | `uuid` | `references auth.users(id) on delete cascade`. The recipient. |
| `actor_user_id` | `uuid` | `references auth.users(id) on delete set null`. The account whose action produced the notification. Null if that account is later deleted. |
| `notification_type` | `text` | One of `new_follower`, `post_like`, `post_comment`, `comment_reply`. |
| `entity_type` | `text` | `profile` \| `post` \| `comment`, or null. |
| `entity_id` | `bigint` | A post id or comment id depending on type, or null for `new_follower`. |
| `read_at` | `timestamptz` | Null while unread; set once, never cleared. |
| `created_at` | `timestamptz` | Default `now()`. |

Constraints: `notifications_type_allowed`, `notifications_entity_type_allowed`,
`notifications_actor_not_recipient` (`actor_user_id is null or actor_user_id
<> user_id`), and `notifications_type_entity_consistent`, which ties each
`notification_type` to its exact `(entity_type, entity_id nullability)` shape
— `new_follower` → (`profile`, null); `post_like` / `post_comment` →
(`post`, not null); `comment_reply` → (`comment`, not null). No row shaped any
other way can ever be inserted.

`entity_id` is **intentionally not foreign-keyed**. It is polymorphic — a post
id for `post_like` / `post_comment`, a comment id for `comment_reply` — and
Postgres has no conditional foreign key. Staleness (the referenced post or
comment later soft-deleted) is handled by `list_notifications()`, not by
cascade — see "Deleted content" below.

Indexes: `(user_id, created_at desc)` (the list), `(user_id, read_at,
created_at desc)` (unread-first / unread-count queries), `(actor_user_id)`.

## Notification creation

Notifications are created by three new `AFTER INSERT` triggers attached (in
this migration) to the **already-shipped** `public.follows`,
`public.post_likes` and `public.post_comments` tables — the exact insert
paths `follow_user()`, `like_post()` and `create_comment()` already funnel
through. This is additive DDL against existing tables, not a change to the
migrations that created them, and it means there is no new client-writable
surface: a browser cannot insert an arbitrary notification row, because there
is no `INSERT` grant on `public.notifications` for any client role at all —
every row is written by a `SECURITY DEFINER` trigger function running as the
table owner.

| Event | Trigger | Recipient | Notification |
| --- | --- | --- | --- |
| A follows B | `follows_notify_new_follower` on `follows` | B | `new_follower`, actor A |
| A likes B's post | `post_likes_notify_like` on `post_likes` | B (post owner) | `post_like`, actor A |
| A comments on B's post (top-level) | `post_comments_notify_comment` on `post_comments` | B (post owner) | `post_comment`, actor A |
| A replies to B's comment | same trigger, `parent_comment_id is not null` | B (parent comment's author) | `comment_reply`, actor A |

A user is never notified about their own action — every trigger skips the
self case (`actor = recipient`), and `notifications_actor_not_recipient`
enforces it at the table level regardless of insert path.

### Dedup policy

A like/unlike/re-like cycle, or a follow/unfollow/re-follow cycle, notifies
the recipient **once** — the first time that actor produces that relationship
with that target. `notify_post_like()` / `notify_new_follower()` check for an
existing notification with the same `(user_id, actor_user_id,
notification_type[, entity_id])` before inserting. This is deterministic,
needs no time-window heuristic, and matches "prefer no uncontrolled
notification spam" — a user rapidly toggling like/unlike on the same post
cannot flood the recipient. A different post, or a different actor liking the
same post, each notify normally. Comments and replies are **not**
deduplicated: each is a distinct real event (different comment id), not a
repeatable toggle.

## Security

RLS is enabled with a revoke-first model, matching Pass 1 / Pass 2.

| | `anon` | `authenticated` |
| --- | --- | --- |
| `notifications` | none | `select` only |

Policy: `"Users can read their own notifications"` — `using ((select
auth.uid()) = user_id)`. No `insert` / `update` / `delete` grant or policy for
any client role — creation is trigger-only (above); read-state changes go
through the two RPCs below.

All RPCs: `language plpgsql`, `security definer`, `set search_path = ''`,
every object schema-qualified, viewer from `auth.uid()`, `revoke all … from
public, anon` then `grant execute … to authenticated`. Reads are `stable`.
The three trigger functions additionally revoke `execute` from
`authenticated` — they are invoked only by their triggers, never called
directly, matching `enforce_follow_not_blocked` / `clear_follows_on_block`
from Pass 1.

| Function | Purpose |
| --- | --- |
| `list_notifications(p_before_created_at, p_before_id, p_limit)` | The viewer's notifications, newest first, keyset paginated, block filtered, with resolved actor + target info. |
| `get_unread_notification_count()` | The viewer's unread count, same block filter. |
| `mark_notification_read(p_notification_id)` | Marks one of the caller's own notifications read. Idempotent, silently a no-op for an id that isn't theirs. |
| `mark_all_notifications_read()` | Marks all of the caller's unread notifications read. |

`user_id` is never trusted from a client — every function derives the acting
user from `auth.uid()` and scopes every read/write to it.

## Block integration

A notification whose actor is now blocked in either direction is **hidden
entirely** — `list_notifications()` and `get_unread_notification_count()`
both filter out any row where `blocked_between(auth.uid(), actor_user_id)`
holds, reusing the Pass 2 `blocked_between()` function directly (it already
has `execute` granted to `authenticated`). This is the brief's preferred
policy for historical notifications once a block now stands: once A blocks B
(or B blocks A), neither account's past notifications from the other are
rendered, in either direction. The underlying rows are not deleted — if the
block is later undone, the notifications reappear, exactly like Pass 2's
existing likes/bookmarks/comments, which are also not deleted by a block.

## Deleted content

This is a **separate, distinct** rule from the block policy above. A
notification whose target post or comment was later soft-deleted (no block
involved) is **still returned** — its sentence never contained the
post/comment body, only who did what ("Sarah liked your post"), so nothing is
leaked by keeping the row. What changes is `target_available`, computed
per-type inside `list_notifications()`:

- `post_like` / `post_comment` → `target_available = viewer_can_see_post(entity_id)` (reused from Pass 2 — covers deleted, visibility-narrowed and blocked-author cases in one call).
- `comment_reply` → available iff the comment itself is still live (`deleted_at is null`) and its post is visible to the viewer.
- `new_follower` → available iff the actor still resolves to a completed profile.

When `target_available` is false, the application renders the row as plain,
non-navigable text ("This content is no longer available.") instead of a
link. One consistent rule, applied the same way regardless of *why* the
target became unavailable.

## Notification page

`/notifications` lists the viewer's notifications newest first, 20 per page
with "Load more" (keyset pagination on `(created_at, id)`, identical shape to
the Pass 2 feed cursor). Each row:

- Shows the calm sentence (`describeNotification()` in
  `src/lib/social/notification-labels.ts`) and a relative timestamp.
- Marks unread state with visible text ("New"), never colour alone.
- Links through `/notifications/open/<id>?to=<local-path>` when
  `target_available` — a **Route Handler**, not a page, that marks the
  notification read and redirects, giving "open it → it becomes read" with
  zero client JavaScript. The `to` value is generated server-side by
  `notificationHref()` when the list renders, but the handler independently
  re-validates it against a strict allow-list
  (`/^\/(posts\/\d+|profile\/[a-z0-9_]{3,30})$/`) before ever using it in a
  redirect, falling back to `/notifications` otherwise — closing any
  open-redirect risk even though the value is same-origin-generated.
- Falls back to plain text + an inline "Mark as read" form (a plain
  server-action form, no client JavaScript) when the target is unavailable.

"Mark all read" is a plain `<form action={markAllNotificationsReadAction}>`,
shown only when the viewer has at least one unread notification.

## Unread indicator

The app navigation shows `Notifications` with a small accessible count badge
(e.g. `Notifications 3`) when the unread count is greater than zero — text,
not colour alone, and never styled as an urgent/red alert. The count is
computed once per request in `app/(protected)/layout.tsx` (which already
authenticates every protected page) and passed down as a prop to
`AppHeader` — no client polling, matching "a server-rendered count is
sufficient for this phase."

## Discover

`/discover` has two independent sections.

**People to discover** — `discover_people()`: completed profiles, excluding
the viewer, anyone already followed, and anyone blocked in either direction.
Ranked by shared-interest overlap with the viewer (a plain count over
`public.user_interests`, not an AI recommendation), then account age, then
`id` as a final deterministic tie-break so paging never skips or repeats a
row. Page-based pagination, 20 per page (`?peoplePage=`). Each card shows
display name, `@username`, a truncated bio, the shared-interest count when
non-zero, and a **Follow** button using the existing `follow_user()` /
`unfollow_user()` path (`src/components/social/follow-button.tsx` +
`followProfile` / `unfollowProfile` from
`app/(protected)/profile/[username]/actions.ts` — no new follow semantics).

**Recent public posts** — `list_discover_posts()`: `visibility = 'public'`,
not soft-deleted, not blocked in either direction, newest first, keyset
paginated exactly like `list_feed()`. It returns the identical row shape
(`FeedPostRow`), so the application layer reuses `mapPost()` / `toPage()`
(now exported, additively, from `src/lib/social/post-data.ts`) and the
existing `PostFeed` / `PostCard` components render it unchanged — full like /
comment / save interactivity, no new components needed for the post side of
Discover.

## Search

`/search?q=...` validates the query (`parseSearchQuery()` —
trim, collapse internal whitespace, length `[2, 100]`, silently truncated
rather than erroring on something huge) before calling either RPC. An empty
query renders only the search box. A query shorter than 2 characters shows
"Type at least 2 characters to search." instead of "No results," so a user
mid-typing is never told a real search found nothing.

**People** — `search_people()`: case-insensitive substring match (`ilike`,
parameter-bound — never string-built SQL) against `username`, `display_name`
or `bio`; same completed / not-self / not-blocked filters as
`discover_people()`; ordered prefix-match-first, then `username asc`. Unlike
Discover, search results can include someone the viewer already follows, so
`search_people()` also returns `viewer_follows` per row and the shared
`DiscoverPersonCard` component renders the Follow button in the correct
state either way.

**Posts** — `search_posts()`: the exact same visibility membership rule as
`list_feed()` (own + public + followers-only-and-followed, block filtered)
restricted to a case-insensitive substring match on `body`. Same row shape as
`list_feed()` / `list_discover_posts()`, so it reuses the same
mapping/components too. A private post, a followers-only post the viewer
cannot access, a deleted post, or a blocked account's post can never appear
in search results — the same RPC-level rule that already governs the feed,
not a separate filter that could drift out of sync.

**Documented performance decision**: plain `ILIKE '%…%'`, no `pg_trgm`
trigram index. A GIN trigram index would speed up substring search but needs
a new Postgres extension and materially widens this migration; given the
brief's "fast development, don't overcomplicate" instruction and V1's data
volume, it is deferred. The existing partial `(visibility, created_at desc)`
/ author indexes still drive the `ORDER BY` + visibility filtering; only the
body match itself is a scan over the already-filtered, already-`LIMIT`-ed
candidate set. Revisit with `pg_trgm` if post volume grows enough for this to
matter.

Reserved usernames: `discover` and `search` were added to
`RESERVED_USERNAMES` in `src/lib/profile-validation.ts` (`notifications` was
already reserved from an earlier pass), so no handle can collide with these
routes.

## Application / domain layer

Framework-free code under `src/lib/social/`:

| File | Responsibility |
| --- | --- |
| `pagination.ts` | Shared cursor + page helpers (`encodeCursor`, `parseCursor`, `clampLimit`, `parsePageNumber`, `getOffsetPagination`) for notifications / discover / search. New for Pass 3 so Pass 2's `post-validation.ts` stays untouched. |
| `notification-vocab.ts` | `NOTIFICATION_TYPES`, `NOTIFICATION_ENTITY_TYPES`, type guards — mirrors the CHECK constraints. |
| `notification-data.ts` | `listNotifications()`, `getUnreadNotificationCount()` — typed RPC reads, never throw. |
| `notification-mutations.ts` | `markNotificationRead()`, `markAllNotificationsRead()` — thin RPC wrappers. |
| `notification-labels.ts` | `describeNotification()`, `notificationHref()` (pure, only ever returns `/posts/<id>`, `/profile/<username>` or `null`), `formatNotificationTimestamp()` (reuses Pass 2's `formatPostTimestamp`). |
| `discover-data.ts` | `discoverPeople()`, `listDiscoverPosts()`. |
| `discover-labels.ts` | `sharedInterestLabel()`. |
| `search-validation.ts` | `parseSearchQuery()`, `MIN_QUERY_LENGTH` (2), `MAX_QUERY_LENGTH` (100). |
| `search-data.ts` | `searchPeople()`, `searchPosts()`. |

`src/lib/social/post-data.ts` — `mapPost()` and `toPage()` were made
`export`ed (additive; no behavioural change) so Discover / Search reuse the
exact `FeedPostRow → FeedPost` mapping instead of duplicating it.

`src/types/database.ts` — added `NotificationType`, `NotificationEntityType`,
`Notification`, `NotificationRow`, `DiscoverPersonRow`, `DiscoverPeopleRow`
row types; `notifications` as a read-only `TableDefinition`; and the eight new
RPC signatures. `list_discover_posts` / `search_posts` reuse `FeedPostRow` —
no new row type needed there.

## Server actions

- `app/(protected)/notifications/actions.ts` — `markNotificationReadAction`,
  `markAllNotificationsReadAction`, `loadMoreNotifications`.
- `app/(protected)/discover/actions.ts` — `loadMoreDiscoverPosts`.
- `app/(protected)/search/actions.ts` — `loadMoreSearchPosts` (bound with the
  query text as a leading server argument, same idiom as
  `loadMoreUserPosts.bind(null, authorId)` in Pass 2).

Every export is an async server action, matching the Next.js 16 `"use
server"` convention already used repo-wide. The acting user always comes from
`requireCompletedProfile()`; the RPCs re-derive it.

## Routes

| Route | File | Purpose |
| --- | --- | --- |
| `/notifications` | `app/(protected)/notifications/page.tsx` | The viewer's notifications, newest first, "Mark all read". |
| `/notifications/open/[id]` | `app/(protected)/notifications/open/[id]/route.ts` | GET Route Handler: marks one notification read, redirects to its (re-validated) target. |
| `/discover` | `app/(protected)/discover/page.tsx` | People to discover + recent public posts. |
| `/search` | `app/(protected)/search/page.tsx` | Query box; People and Posts result sections. |

Components live in `src/components/social/`: `notification-row.tsx`,
`notification-feed.tsx`, `discover-person-card.tsx`,
`discover-people-list.tsx`, `search-form.tsx`.

## Performance

- Notifications, Discover and Search all page at 20 rows, hard-capped
  server-side inside every RPC (`least(greatest(coalesce(p_limit, 20), 1),
  20)`), independent of what a client requests.
- Notifications and post lists (feed / discover / search) use keyset
  pagination on `(created_at, id)` — stable under insertion, never an
  `OFFSET` into a large table.
- Discover people / search people use `count(*) over ()` to get the total in
  the same query as the page, rather than a second round trip.
- No N+1 author or engagement lookups: `list_discover_posts()` /
  `search_posts()` fold author + engagement into the same row, exactly like
  `list_feed()`. `list_notifications()` resolves the actor via one `left
  join` and the target via `viewer_can_see_post()` / a single comment lookup
  per row (bounded by the 20-row page).
- New indexes: `notifications(user_id, created_at desc)`,
  `notifications(user_id, read_at, created_at desc)`,
  `notifications(actor_user_id)`.

## Accessibility

Notification rows are a semantic `<ul>`/`<li>` list; unread state has an
explicit "New" label plus an `aria-label` on the row, never colour alone.
The per-row "Mark as read" fallback and "Mark all read" are real `<button>`s
inside real `<form>`s (`min-h-11` / `min-h-8` touch targets, focus-visible
rings). The search input has a visually-hidden `<label>`, `role="search"` on
the form, and the "too short" / empty states are announced via `role="status"`
text rather than only visual styling. Discover / Search Follow buttons reuse
`FollowButton`'s existing accessible names (`aria-label="Follow <name>"` /
`"Unfollow <name>"`). All new interactive controls meet the ~44px touch
target and are keyboard-operable; no layout introduces horizontal overflow at
375px (single-column stacking, `flex-wrap` on the header's nav row).

## Tests

Vitest unit tests for pure logic only — RLS and the trigger-based
notification generation are verified with the SQL below and the two-user
manual sequence, never by Vitest:

- `notification-vocab.test.ts` — controlled vocabulary + guards.
- `notification-labels.test.ts` — sentence mapping per type (incl. the
  "Someone" fallback for a deleted actor) and `notificationHref()` safe
  target generation (never anything but the two allowed shapes or `null`).
- `pagination.test.ts` — cursor encode/parse round trip and invalid inputs,
  `clampLimit`, `parsePageNumber`, `getOffsetPagination`.
- `search-validation.test.ts` — normalisation, min/max length rules,
  truncation instead of erroring on a huge input.
- `discover-labels.test.ts` — shared-interest count pluralisation.

## SQL verification

Run in the Supabase SQL Editor **after** applying the migration.

### Table exists with RLS

```sql
select relname, relrowsecurity
from pg_class
where oid = 'public.notifications'::regclass;
```

`relrowsecurity` must be `true`.

### Constraints

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.notifications'::regclass
order by conname;
```

Expect `notifications_type_allowed`, `notifications_entity_type_allowed`,
`notifications_actor_not_recipient`, `notifications_type_entity_consistent`.

### Grants — no writes for any client role

```sql
select table_name, privilege_type, grantee
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'notifications'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;
```

Expect **only** `SELECT` for `authenticated`, and **no rows** for `anon`.

### Policies

```sql
select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public' and tablename = 'notifications';
```

Expect one `select` policy: `qual` references `auth.uid() = user_id`.

### Indexes

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'notifications'
order by indexname;
```

Expect the three named indexes plus the primary key.

### Function security settings

```sql
select p.proname, p.prosecdef as security_definer, p.provolatile as volatility,
       p.proconfig as config
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'notify_new_follower','notify_post_like','notify_post_comment',
    'list_notifications','get_unread_notification_count',
    'mark_notification_read','mark_all_notifications_read',
    'discover_people','list_discover_posts','search_people','search_posts'
  )
order by p.proname;
```

`security_definer = true` and `config = {search_path=""}` for all eleven. The
five read functions (`list_notifications`, `get_unread_notification_count`,
`discover_people`, `list_discover_posts`, `search_people`, `search_posts`)
are `s` (stable); the rest `v` (volatile).

### Execution privileges

```sql
select p.proname,
  has_function_privilege('authenticated', p.oid, 'execute') as auth_exec,
  has_function_privilege('anon', p.oid, 'execute')          as anon_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'notify_new_follower','notify_post_like','notify_post_comment',
    'list_notifications','get_unread_notification_count',
    'mark_notification_read','mark_all_notifications_read',
    'discover_people','list_discover_posts','search_people','search_posts'
  );
```

The three trigger functions (`notify_new_follower`, `notify_post_like`,
`notify_post_comment`): `auth_exec = false`. Every other function:
`auth_exec = true`, `anon_exec = false`.

### Triggers are attached

```sql
select tgrelid::regclass as table, tgname
from pg_trigger
where tgrelid in (
  'public.follows'::regclass,
  'public.post_likes'::regclass,
  'public.post_comments'::regclass
)
and not tgisinternal
order by 1, 2;
```

Expect `follows_notify_new_follower` on `follows` (alongside the existing
`follows_enforce_not_blocked`), `post_likes_notify_like` on `post_likes`, and
`post_comments_notify_comment` on `post_comments` (alongside the existing
`post_comments_enforce_one_level` and `post_comments_set_updated_at`).

### Data-ownership / privacy spot checks

Authenticated separately as **A** and **B**:

```sql
-- As B: cannot read A's notifications directly.
select count(*) from public.notifications where user_id <> auth.uid(); -- 0

-- Re-liking after unliking does not create a second notification.
select public.like_post(<A_post_id>);   -- as B
select public.unlike_post(<A_post_id>); -- as B
select public.like_post(<A_post_id>);   -- as B, again
select count(*) from public.notifications
where user_id = '<A-uuid>' and actor_user_id = auth.uid()
  and notification_type = 'post_like' and entity_id = <A_post_id>; -- 1

-- After A blocks B, A's list_notifications() no longer returns any
-- notification whose actor is B.
select count(*) from public.list_notifications()
where actor_user_id = '<B-uuid>'; -- 0 (as A, once A has blocked B)

-- discover_people() never returns the viewer, an already-followed account,
-- or a blocked account (either direction).
select count(*) from public.discover_people() where id = auth.uid(); -- 0
```

## Two-user manual verification

Two completed-onboarding accounts, **A** and **B**. No further DB changes.

| # | Step | Expected |
| --- | --- | --- |
| 1 | A: `/profile/<B>` → Follow | B follows notified. |
| 2 | B: `/notifications` | "A started following you." shown, marked New. |
| 3 | B: open it | Redirects to A's profile; row now shows read on reload. |
| 4 | A: `/feed` → create a public post | Post created. |
| 5 | B: like A's post | A receives "B liked your post." |
| 6 | B: unlike, then like again | Still only **one** `post_like` notification for A from B on that post. |
| 7 | B: comment on A's post | A receives "B commented on your post." |
| 8 | A: reply to B's comment | B receives "A replied to your comment." |
| 9 | Open a notification | It becomes read; unread count in the header decreases. |
| 10 | `/notifications` → "Mark all read" | All rows read; badge disappears from the header. |
| 11 | A, B: `/discover` | Each sees the other (if not already following) with a Follow button; excludes self, already-followed and blocked accounts. |
| 12 | `/search?q=<B's username>` | B appears under People. |
| 13 | `/search?q=<text from A's public post>` | The post appears under Posts. |
| 14 | A: create a private post; B searches its text | Never appears for B. |
| 15 | A: create a followers-only post; B (not following) searches its text | Never appears for B; appears once B follows A. |
| 16 | A blocks B | Neither appears in the other's `/discover` or `/search` afterward; A's/B's existing notifications from each other stop rendering. |
| 17 | Regression | `/daily-prime`, `/connections`, `/feed`, `/saved`, `/profile/<username>` (follow/block) all unchanged and working. |
| 18 | 375px viewport | `/notifications`, `/discover`, `/search` all single-column, no horizontal scroll, header wraps cleanly with the search box. |

## Rollback

Pass 3 is a single migration. To roll it back (destructive — deletes all
notification data; back up first):

```sql
begin;
drop function if exists public.search_posts(text, timestamptz, bigint, integer);
drop function if exists public.search_people(text, integer, integer);
drop function if exists public.list_discover_posts(timestamptz, bigint, integer);
drop function if exists public.discover_people(integer, integer);
drop function if exists public.mark_all_notifications_read();
drop function if exists public.mark_notification_read(bigint);
drop function if exists public.get_unread_notification_count();
drop function if exists public.list_notifications(timestamptz, bigint, integer);
drop table if exists public.notifications; -- also drops its three triggers
drop function if exists public.notify_post_comment();
drop function if exists public.notify_post_like();
drop function if exists public.notify_new_follower();
commit;
```

Dropping the table drops its triggers but not the trigger *functions*, so
drop those explicitly after the table. Revert the app code that calls the
Pass 3 RPCs, the `/notifications`, `/discover`, `/search` routes, and the
header's unread badge / search box first. Never drop `auth.users`, and note
that this rollback does **not** touch `public.follows`, `public.post_likes`
or `public.post_comments` themselves — only the triggers Pass 3 added to
them.
