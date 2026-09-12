# Diong Social Content Setup — Social Network Pass 2

Pass 2 adds the first complete Diong social-content experience on top of the
Pass 1 follow / block graph: **posts, a chronological feed, comments with one
reply level, likes and private bookmarks**, plus a Posts section on the public
profile.

Pass 2 does **not** add direct messages, communities, notifications, standalone
Goals / Habits / Journal, an AI Coach, or post images (deferred — see the last
section). It does not change Daily Prime, Prime history / reflections,
Connections, or the Pass 1 social graph, and it does not modify any
already-applied migration.

## What a user can do after Pass 2

- Open `/feed`, write a post (type + body + visibility) with a calm composer,
  and see it in their chronological feed.
- See posts from the people they follow and appropriate public posts, newest
  first, 20 per page with **Load more**.
- Like / unlike, comment, reply once, and privately bookmark a post.
- Open a post at `/posts/<id>` for the full post, its comments and the comment
  form.
- Edit or delete their own post (`/posts/<id>/edit`; delete is a soft delete).
- Edit or delete their own comments.
- See their saved posts at `/saved` (private to them).
- See a member's visible posts in the **Posts** section of
  `/profile/<username>`.

All of this is private to signed-in Diong members. Blocking from Pass 1 is
authoritative over every part of it.

## Migration to run

Apply in order against the target Supabase project, after every earlier
migration:

1. `supabase/migrations/202609100003_social_content.sql`

It depends on `public.profiles` / `auth.users` (202607190001),
`public.follows` / `public.blocks` (202609100002) and `public.set_updated_at()`
(202607190001). It is a single `begin … commit` transaction and is **not**
idempotent — `create table` / `create function` (not `create or replace`) fail
cleanly if the objects already exist. Never re-run a migration that already
succeeded.

With the Supabase CLI linked:

```bash
supabase db push
```

Or paste the whole file once into the SQL Editor, confirm the project, run it,
and record the filename + date in the deployment log.

No new environment variables. No service-role key is used.

## Schema

### `public.posts`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | Primary key. |
| `user_id` | `uuid` | `references auth.users(id) on delete cascade`. Author. Not client-writable. |
| `post_type` | `text` | One of `update`, `reflection`, `progress`, `learning`, `achievement`, `question`, `resource`. Immutable after creation. |
| `body` | `text` | Plain text, trimmed, 1–5000 chars. Rendered as text — never HTML. |
| `visibility` | `text` | `public` \| `followers` \| `private`. Default `public`. Editable. |
| `created_at` | `timestamptz` | Default `now()`. Immutable. |
| `updated_at` | `timestamptz` | Maintained by the `posts_set_updated_at` trigger. |
| `edited_at` | `timestamptz` | Null until the first `update_post`; then the last edit time. |
| `deleted_at` | `timestamptz` | Null while live; set by `soft_delete_post`. A deleted post is invisible to everyone, author included. |

Constraints: `posts_body_not_empty` (`char_length(btrim(body)) between 1 and
5000`), `posts_type_allowed`, `posts_visibility_allowed`.

Indexes (all partial `where deleted_at is null`): `posts_user_created_idx`
`(user_id, created_at desc)`, `posts_created_idx` `(created_at desc, id desc)`,
`posts_visibility_created_idx` `(visibility, created_at desc)`.

### `public.post_comments`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | Primary key. |
| `post_id` | `bigint` | `references public.posts(id) on delete cascade`. |
| `user_id` | `uuid` | `references auth.users(id) on delete cascade`. Not client-writable. |
| `parent_comment_id` | `bigint` | Null for a top-level comment; otherwise a root comment on the same post. |
| `body` | `text` | Plain text, trimmed, 1–2000 chars. |
| `created_at` / `updated_at` / `edited_at` / `deleted_at` | `timestamptz` | As for posts. |

Constraints: `post_comments_body_not_empty`; `post_comments_id_post_id_key`
`unique (id, post_id)`; `post_comments_parent_same_post` — a composite FK
`(parent_comment_id, post_id) → (id, post_id)` that guarantees a reply's parent
is on the same post. The `post_comments_enforce_one_level` **BEFORE INSERT**
trigger additionally rejects a reply whose parent is itself a reply, so the
thread can never nest more than one level regardless of how a row is inserted.

Indexes: `post_comments_post_created_idx` `(post_id, created_at)`,
`post_comments_parent_idx` `(parent_comment_id) where parent_comment_id is not
null`, `post_comments_user_idx` `(user_id)`.

### `public.post_likes` / `public.post_bookmarks`

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | `uuid` | `references auth.users(id) on delete cascade`. |
| `post_id` | `bigint` | `references public.posts(id) on delete cascade`. |
| `created_at` | `timestamptz` | Default `now()`. |

Primary key `(user_id, post_id)` on both — one like / one bookmark per user per
post, and the database is the final authority on that (the RPCs `insert … on
conflict do nothing`). Extra indexes: `post_likes_post_id_idx` `(post_id)` for
counts; `post_bookmarks_user_created_idx` `(user_id, created_at desc)` for the
`/saved` order.

## Visibility model

Encapsulated in `public.viewer_can_see_post(bigint)` and re-applied by every
read RPC and the `posts` RLS policy:

| Post state | Who can see it |
| --- | --- |
| soft-deleted | nobody, author included |
| any visibility, viewer **is** the author | the author |
| a block exists in either direction viewer ↔ author | nobody on the other side |
| `public` | any signed-in member with no block |
| `followers` | the author's current followers, no block |
| `private` | the author alone |

`public.blocked_between(uuid, uuid)` is the single source of the block check. It
is `security definer` because a client can only read blocks it created; the
"who blocked me" side is applied server-side, exactly as in Pass 1.

## Block interaction

If **A blocks B** (or B blocks A):

- A does not see B's posts in the feed, on B's profile, in `/saved`, or at
  `/posts/<id>` (→ branded 404), and vice versa.
- A cannot like, comment on, reply to or bookmark B's posts — every mutation
  RPC calls `viewer_can_see_post` + `blocked_between` first and raises `42501`.
- Existing likes / bookmarks / comments are **not** deleted by a block (they
  simply stop being reachable while the block stands, and reappear if unblocked)
  — only the follow edges are cleared, by the Pass 1 trigger.
- Pass 1 profile-level block behaviour is unchanged.

## Row Level Security

RLS is enabled on all four tables with a revoke-first model. `anon` has no
access. `authenticated` has **`SELECT` only** — every write goes through a
`SECURITY DEFINER` RPC (the Pass 1 model).

| Table | `select` policy |
| --- | --- |
| `posts` | `deleted_at is null and (author OR (no block AND (public OR followers-and-followed)))` — the same rule as `viewer_can_see_post`, inlined for the planner. |
| `post_comments` | `viewer_can_see_post(post_id) and not blocked_between(auth.uid(), user_id)` — deleted comments stay selectable so a thread keeps its shape; the list RPC blanks their body. |
| `post_likes` | `user_id = auth.uid()` — you read only your own likes. Counts come from the RPCs; "who liked" is never exposed row-by-row. |
| `post_bookmarks` | `user_id = auth.uid()` — bookmarks are private. |

### RPCs

All: `language plpgsql` / `sql`, `security definer`, `set search_path = ''`,
every object schema-qualified, viewer from `auth.uid()`, `revoke all … from
public, anon` then `grant execute … to authenticated`. Reads are `stable`.

| Function | Purpose |
| --- | --- |
| `list_feed(p_before_created_at, p_before_id, p_limit)` | The viewer's chronological feed: own posts + public + followers-only-from-followed, block filtered, newest first, keyset paginated. `p_limit` clamped to `[1, 20]`. |
| `get_post(p_post_id)` | One post from the viewer's point of view; **no row** when it is not visible. |
| `list_user_posts(p_author_id, …cursor…, p_limit)` | One author's posts the viewer may see; nothing when blocked. |
| `list_bookmarks(p_before_created_at, p_before_post_id, p_limit)` | The viewer's bookmarked posts, most recently saved first; a now-invisible post is dropped, never exposed. |
| `get_post_engagement(p_post_ids bigint[])` | Fresh `like_count` / `comment_count` / viewer flags for a set of visible posts. |
| `list_post_comments(p_post_id)` | Top-level comments + their single reply level for a visible post, oldest first, block filtered, capped at 500. A deleted root is returned as a tombstone (`body` null, `is_deleted` true) only when it still has a live reply; deleted replies are dropped. |
| `create_post(p_post_type, p_body, p_visibility)` | Validates type / visibility / body (1–5000); returns the new id. |
| `update_post(p_post_id, p_body, p_visibility)` | Author-only, live post only. Changes body + visibility, stamps `edited_at`. `id` / `user_id` / `post_type` / `created_at` can never change. |
| `soft_delete_post(p_post_id)` | Author-only. Sets `deleted_at`. |
| `create_comment(p_post_id, p_body, p_parent_comment_id)` | Post must be visible + unblocked; body 1–2000; a reply's parent must be a live root on the same post. |
| `edit_own_comment(p_comment_id, p_body)` / `delete_own_comment(p_comment_id)` | Author-only; delete is a soft delete. |
| `like_post` / `unlike_post` / `bookmark_post` / `remove_bookmark` `(p_post_id)` | Idempotent. Like / bookmark require a visible, unblocked post; the composite primary key is the final authority against duplicates. |

Engagement counts are folded into `list_feed` / `get_post` / `list_user_posts` /
`list_bookmarks` so a feed of 20 posts is **one** round trip — no N+1 per-post
count or author query.

## Feed strategy

The feed is strictly chronological (newest first). There is **no engagement
ranking**, no "trending", no FOMO copy, no view counts and no popularity score.
The membership rule is "posts the viewer is allowed to see whose author is the
viewer, or is followed by the viewer, or whose post is public" — which is
exactly "own + followed + public", block filtered.

## Pagination

Keyset ("cursor") pagination on `(created_at, id)` — stable under insertion,
and it never asks the database for a large `OFFSET`. The cursor is serialised as
`"<epoch-ms>_<id>"`, opaque to the UI. Page size is **20**, clamped server-side
in both the RPC and `clampLimit()`. `parseFeedCursor()` returns null for a
malformed / non-decimal / out-of-range cursor, and the caller then serves the
first page rather than erroring. The first page is server-rendered; **Load
more** appends the next page through a server action (`loadMoreFeed` /
`loadMoreUserPosts` / `loadMoreBookmarks`).

## Comments / replies

One reply level only, enforced three ways: the composite FK (`same post`), the
`post_comments_enforce_one_level` trigger (`parent is a root`), and the
`create_comment` RPC. The UI only offers **Reply** on top-level comments. A
deleted comment shows "Comment removed" when it is a root that still has a live
reply (context preserved); otherwise it disappears. Deleted content is never
returned to the client — the RPC sends `body = null`.

## Likes

Like only — no reaction types. `like_post` / `unlike_post` are idempotent; rapid
duplicate clicks cannot create duplicates because `(user_id, post_id)` is the
primary key. After a change the server action revalidates `/feed`, `/saved` and
`/posts/<id>`. Raw constraint errors are never surfaced — the mutation wrappers
map `23505` / `23514` / `42501` to a small controlled result.

## Bookmarks + `/saved`

Bookmarks are private: only the owner can read `post_bookmarks` (RLS) and only
`list_bookmarks` (which runs as the owner) returns them. `/saved` lists them
newest-saved-first. If a bookmarked post later becomes invisible (deleted,
blocked, visibility narrowed) it is silently dropped from `/saved` — never
shown. Empty state: "No saved posts yet."

## Post detail

`/posts/<id>` calls `get_post`. A missing, deleted, private,
followers-only-not-followed or blocked post all return **no row**, and the page
calls `notFound()` — the same branded 404 as a genuinely missing id. The page
never reveals that a hidden post exists. `/posts/<id>/edit` additionally
requires `is_author`.

## Profile posts

`/profile/<username>` gains a **Posts** section fed by `list_user_posts`, which
applies the same visibility + block model. A non-follower never sees
followers-only posts; nobody but the author sees private posts; a blocked viewer
sees nothing (and in fact cannot resolve the profile at all — Pass 1). Pass 1
follower / following counts and controls are unchanged.

## Application / domain layer

Framework-free code under `src/lib/social/`:

| File | Responsibility |
| --- | --- |
| `post-vocab.ts` | `POST_TYPES`, `POST_VISIBILITIES`, `isPostType`, `isPostVisibility`. |
| `post-validation.ts` | `normalizePostBody` (strip control chars, normalise newlines, trim), `validatePostInput` / `validateCommentInput`, `POST_BODY_MAX` (5000) / `COMMENT_BODY_MAX` (2000), `FEED_PAGE_SIZE` (20), `parseFeedCursor` / `encodeFeedCursor` / `clampLimit` / `parseCommentParentId`. |
| `post-visibility.ts` | `canViewPost(...)` — a pure mirror of `viewer_can_see_post`. Defence-in-depth + documentation only; the database is authoritative. |
| `post-labels.ts` | `POST_TYPE_LABEL` / hints, `POST_VISIBILITY_LABEL`, `likeLabel` / `commentLabel`, `formatPostTimestamp` (calm relative time). |
| `post-form-state.ts` | Form value shapes, action-state shapes, `FormData` readers. |
| `post-data.ts` | Typed RPC reads: `listFeedPosts`, `getPost`, `listUserPosts`, `listBookmarks`, `listComments`, `getPostEngagement`, `buildCommentThread`. Never throw. |
| `post-mutations.ts` | Thin RPC wrappers returning `{ status, reason }`; map `42501` → `not_available`, `22023`/`23514`/`23503` → `invalid`, else logged + `unknown`. |

`src/types/database.ts` — added `Post`, `PostComment`, `PostLike`,
`PostBookmark` row types; `PostType` / `PostVisibility`; the RPC row types
(`FeedPostRow`, `BookmarkPostRow`, `PostCommentRow`, `PostEngagementRow`); the
four tables as read-only `TableDefinition`s; and every new RPC signature.

`src/lib/profile-validation.ts` — added `feed`, `posts`, `saved` to
`RESERVED_USERNAMES`.

## Server actions

- `app/(protected)/feed/actions.ts` — `createPost`, `loadMoreFeed`.
- `app/(protected)/posts/actions.ts` — `toggleLike`, `toggleBookmark`,
  `submitComment`, `editCommentAction`, `deleteCommentAction`, `updatePostAction`,
  `deletePostAction`, `loadMoreUserPosts`.
- `app/(protected)/saved/actions.ts` — `loadMoreBookmarks`.

Every export is an async server action. Post / comment ids and the author id are
**bound as leading server arguments** by the rendering component — never form
fields. The acting user always comes from `requireCompletedProfile()`; the RPCs
re-derive it. Errors return a safe generic message and preserve the previous UI
state.

## Routes

| Route | File | Purpose |
| --- | --- | --- |
| `/feed` | `app/(protected)/feed/page.tsx` | Composer + chronological feed, **Load more**. |
| `/posts/[id]` | `app/(protected)/posts/[id]/page.tsx` | Full post + comments + reply + comment form. `notFound()` when not visible. |
| `/posts/[id]/edit` | `app/(protected)/posts/[id]/edit/page.tsx` | Author-only body + visibility edit. |
| `/saved` | `app/(protected)/saved/page.tsx` | The viewer's private bookmarks, newest saved first. |
| `/profile/[username]` | (upgraded) | Adds the **Posts** section. |

Components live in `src/components/social/`: `post-composer.tsx`,
`post-feed.tsx`, `post-card.tsx`, `post-engagement-bar.tsx`,
`post-owner-actions.tsx`, `post-edit-form.tsx`, `post-timestamp.tsx`,
`comment-thread.tsx`, `comment-card.tsx`, `comment-form.tsx`.

## Performance

- One round trip per feed page (counts + author folded into the RPC).
- Keyset pagination, hard page cap of 20, partial indexes for every access path.
- Comments for the feed are **not** fetched — only the count. The full thread is
  loaded once, on the detail page, capped at 500 rows.
- Server Components everywhere except the interactive islands (composer, toggle
  buttons, comment forms, "Load more").

## Accessibility

Composer and every comment form have real `<label>`s and an accessible error
line. Like / Save use `aria-pressed` and a glyph change (never colour alone).
Each post is an `<article>`; the comment section is a labelled `<section>`.
Errors use `role="alert"`, success uses `role="status"`. Touch targets are
`min-h-11` / `min-h-12` (≈44px). `whitespace-pre-wrap break-words` on every body
keeps a 375px viewport free of horizontal overflow.

## Image / media

**Deferred to Pass 2.1.** One image per post (Supabase Storage, jpeg/png/webp,
≤8MB, generated safe path, server-side validation, orphan cleanup, bucket RLS)
is designed but not built — adding it now would widen this pass's storage,
validation and moderation surface. Video is explicitly out of scope. When
implemented it will add a nullable `image_path text` column to `public.posts`
plus a storage bucket and its RLS; nothing about the current schema blocks it.

## Manual SQL verification

Run in the Supabase SQL Editor **after** applying the migration.

### Tables exist with RLS

```sql
select relname, relrowsecurity
from pg_class
where oid in (
  'public.posts'::regclass, 'public.post_comments'::regclass,
  'public.post_likes'::regclass, 'public.post_bookmarks'::regclass
)
order by relname;
```

All four `relrowsecurity` must be `true`.

### Constraints (CHECK + UNIQUE + PK)

```sql
select conrelid::regclass as tbl, conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid in (
  'public.posts'::regclass, 'public.post_comments'::regclass,
  'public.post_likes'::regclass, 'public.post_bookmarks'::regclass
)
and contype in ('c', 'u', 'p', 'f')
order by conrelid::regclass::text, conname;
```

Expect the body / type / visibility CHECKs on `posts`; the body CHECK, the
`(id, post_id)` UNIQUE and the composite parent FK on `post_comments`; and the
`(user_id, post_id)` primary keys on `post_likes` / `post_bookmarks`.

### Grants — no writes for any client role

```sql
select table_name, privilege_type, grantee
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('posts', 'post_comments', 'post_likes', 'post_bookmarks')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

Expect **only** `SELECT` for `authenticated`, and **no rows** for `anon`.

### Policies

```sql
select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('posts', 'post_comments', 'post_likes', 'post_bookmarks')
order by tablename, cmd;
```

Expect exactly one `select` policy per table, and the qualifiers described in
the RLS section above. No `insert` / `update` / `delete` policies.

### Indexes

```sql
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('posts', 'post_comments', 'post_likes', 'post_bookmarks')
order by tablename, indexname;
```

Expect the six named indexes plus the primary keys.

### Function security settings

```sql
select p.proname, p.prosecdef as security_definer, p.provolatile as volatility,
       p.proconfig as config
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'blocked_between','viewer_can_see_post','list_feed','get_post',
    'list_user_posts','list_bookmarks','get_post_engagement','list_post_comments',
    'create_post','update_post','soft_delete_post','create_comment',
    'edit_own_comment','delete_own_comment','like_post','unlike_post',
    'bookmark_post','remove_bookmark','enforce_comment_one_level'
  )
order by p.proname;
```

`security_definer = true` and `config = {search_path=""}` for all. The eight read
functions are `s` (stable); the rest `v` (volatile).

### Execution privileges

```sql
select p.proname,
  has_function_privilege('authenticated', p.oid, 'execute') as auth_exec,
  has_function_privilege('anon', p.oid, 'execute')          as anon_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'list_feed','get_post','list_user_posts','list_bookmarks',
    'get_post_engagement','list_post_comments','create_post','update_post',
    'soft_delete_post','create_comment','edit_own_comment','delete_own_comment',
    'like_post','unlike_post','bookmark_post','remove_bookmark',
    'blocked_between','viewer_can_see_post','enforce_comment_one_level'
  );
```

`enforce_comment_one_level`: `auth_exec = false`. Every other function:
`auth_exec = true`, `anon_exec = false`.

### Data-ownership / privacy spot checks

Authenticated separately as **A** and **B**:

```sql
-- As B: cannot read A's bookmarks or likes directly.
select count(*) from public.post_bookmarks where user_id <> auth.uid(); -- 0
select count(*) from public.post_likes    where user_id <> auth.uid(); -- 0

-- As B while A's post is private: get_post returns no row.
select * from public.get_post(<A_private_post_id>); -- 0 rows

-- As B after A blocks B: list_user_posts(A) returns nothing, like_post raises.
select * from public.list_user_posts('<A-uuid>'); -- 0 rows
select public.like_post(<A_post_id>);             -- ERROR 42501

-- Duplicate like is idempotent, never errors.
select public.like_post(<visible_post_id>);
select public.like_post(<visible_post_id>);
select count(*) from public.post_likes where post_id = <visible_post_id> and user_id = auth.uid(); -- 1

-- One reply level: replying to a reply is rejected.
select public.create_comment(<post_id>, 'x', <a_reply_comment_id>); -- ERROR 22023
```

## Manual browser verification

Two completed-onboarding accounts, **A** and **B**. No further DB changes.

| # | Step | Expected |
| --- | --- | --- |
| 1 | A: `/feed` → compose a **public** post, Share | Composer clears, "Shared with your feed. View it". |
| 2 | B: `/feed` (or B follows A first) | A's post appears in B's feed, newest first. |
| 3 | B: click the **Like** button on A's post | Button shows pressed state + "1 like". |
| 4 | Reload | Count stays **1 like**. |
| 5 | B: click **Like** again (unlike) | Returns to unpressed + "0 likes". |
| 6 | Reload | Count is correct (0). |
| 7 | B: open the post, add a comment | Comment appears under the composer. |
| 8 | A: open the same post | A sees B's comment and the count. |
| 9 | A: click **Reply** on B's comment, submit | Reply appears, indented, once. |
| 10 | A: try to reply to that reply | No **Reply** control on a reply — one level only. |
| 11 | B: on the post, click **Save** | Pressed state + "Saved". |
| 12 | B: open `/saved` | The post is listed. |
| 13 | B: click **Save** again (remove) → reload `/saved` | The post is gone; empty state if it was the only one. |
| 14 | A: `/posts/<id>/edit` → change the body, Save | Redirects to the post; body updated; "· edited" shown. |
| 15 | B: reload the post | B sees the updated body. |
| 16 | A: compose a **followers-only** post | Created. |
| 17 | B (following A): `/feed` | B sees the followers-only post. |
| 18 | C (not following A) or B after unfollowing: `/feed` and `/profile/<A>` | The followers-only post is **not** visible. |
| 19 | A: compose a **private** post | Created. |
| 20 | A: `/feed` and `/profile/<A>` | Only A sees it; B never does; `/posts/<that id>` as B → branded 404. |
| 21 | A: `/profile/<B>` → **Block** → confirm | Pass 1 blocked panel. |
| 22 | A: `/feed` | None of B's posts appear. B's posts gone from `/profile/<B>` too (404 for A). |
| 23 | B: `/posts/<A post id>` and attempts to like / comment | Branded 404 for the page; the like / comment controls error safely if reached. |
| 24 | A: **Unblock** B | A sees B's posts again; interactions work again. Any old like / bookmark is still there. |
| 25 | Any viewer: `/profile/<username>` | Posts section shows only posts that viewer may see, newest first. |
| 26 | `/posts/999999999` | Branded 404, not an error page. |
| 27 | `/daily-prime`, `/daily-prime/history` | Unchanged and working. |
| 28 | `/connections`, `/connections/<id>` | Unchanged and working. |
| 29 | `/profile/<username>/followers` and `/following` | Pass 1 lists unchanged and working. |
| 30 | 375px viewport on `/feed`, `/posts/<id>`, `/saved`, `/profile/<username>` | Single column, controls wrap, no horizontal scroll. |

## Rollback

Pass 2 is a single migration. To roll it back (destructive — deletes all posts,
comments, likes and bookmarks; back up first):

```sql
begin;
drop function if exists public.list_feed(timestamptz, bigint, integer);
drop function if exists public.get_post(bigint);
drop function if exists public.list_user_posts(uuid, timestamptz, bigint, integer);
drop function if exists public.list_bookmarks(timestamptz, bigint, integer);
drop function if exists public.get_post_engagement(bigint[]);
drop function if exists public.list_post_comments(bigint);
drop function if exists public.create_post(text, text, text);
drop function if exists public.update_post(bigint, text, text);
drop function if exists public.soft_delete_post(bigint);
drop function if exists public.create_comment(bigint, text, bigint);
drop function if exists public.edit_own_comment(bigint, text);
drop function if exists public.delete_own_comment(bigint);
drop function if exists public.like_post(bigint);
drop function if exists public.unlike_post(bigint);
drop function if exists public.bookmark_post(bigint);
drop function if exists public.remove_bookmark(bigint);
drop table if exists public.post_bookmarks;
drop table if exists public.post_likes;
drop table if exists public.post_comments;  -- also drops post_comments_enforce_one_level
drop table if exists public.posts;
drop function if exists public.enforce_comment_one_level();
drop function if exists public.viewer_can_see_post(bigint);
drop function if exists public.blocked_between(uuid, uuid);
commit;
```

Revert the app code that calls these RPCs and the `/profile/[username]` Posts
section first. After real members have posted, a forward corrective migration is
safer than a rollback.
