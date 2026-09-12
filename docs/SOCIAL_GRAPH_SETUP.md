# Diong Social Graph Setup — Social Network Pass 1

Pass 1 adds the **social graph foundation**: follow / unfollow, block / unblock,
follower & following lists, expanded public profiles with social counts, and a
privacy-safe, block-aware read path that later feed / messaging / community
layers can build on.

Pass 1 does **not** add posts, a feed, likes, comments, direct messages,
notifications or communities. It does not change Daily Prime, Prime history /
reflections, or Connections, and it does not modify any already-applied
migration.

## What a user can do after Pass 1

- Open any completed-onboarding member's profile at `/profile/<username>`.
- Follow and unfollow that member.
- Block and unblock that member (blocking is authoritative — see below).
- See a member's follower and following counts, and browse both lists
  (`/profile/<username>/followers`, `/profile/<username>/following`), paginated.
- See **Edit profile** instead of follow controls on their own profile.

All of this is private to signed-in Diong members. There is no anonymous access
to any social data.

## Migration to run

Apply in order against the target Supabase project, after every earlier
migration:

1. `supabase/migrations/202609100002_social_graph.sql`

It depends only on `public.profiles` / `auth.users` from
`202607190001_onboarding_and_profiles.sql`. It is a single `begin … commit`
transaction and is **not** idempotent — `create table` / `create function`
(not `create or replace`) fail cleanly if the objects already exist. Never
re-run a migration that already succeeded.

With the Supabase CLI linked:

```bash
supabase db push
```

Or paste the whole file once into the SQL Editor, confirm the project, run it,
and record the filename + date in the deployment log.

The web app needs only the existing public environment variables
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). No
service-role key is used.

## Schema

### `public.follows`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | Primary key. |
| `follower_id` | `uuid` | `references auth.users(id) on delete cascade`. The account doing the following. Not client-writable. |
| `following_id` | `uuid` | `references auth.users(id) on delete cascade`. The account being followed. Not client-writable. |
| `created_at` | `timestamptz` | Defaults to `now()`. |

Constraints: `check (follower_id <> following_id)` (`follows_no_self_follow`),
`unique (follower_id, following_id)` (`follows_unique_pair`).

Indexes: the unique constraint covers `(follower_id, …)` ("who does X follow" /
following list). `follows_following_id_idx` on `(following_id)` covers "who
follows X" / followers list.

### `public.blocks`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | Primary key. |
| `blocker_id` | `uuid` | `references auth.users(id) on delete cascade`. The account that created the block. |
| `blocked_id` | `uuid` | `references auth.users(id) on delete cascade`. The account that is blocked. |
| `created_at` | `timestamptz` | Defaults to `now()`. |

Constraints: `check (blocker_id <> blocked_id)` (`blocks_no_self_block`),
`unique (blocker_id, blocked_id)` (`blocks_unique_pair`).

Indexes: `blocks_blocker_id_idx` on `(blocker_id)`, `blocks_blocked_id_idx` on
`(blocked_id)` — both directions are queried by the RPCs and triggers.

## Ownership model

- Both tables reference `auth.users(id)` with `on delete cascade`: deleting an
  auth user removes all of their follow and block rows in both directions.
- **Neither table has an `INSERT`, `UPDATE` or `DELETE` grant.** `authenticated`
  has `SELECT` only. Every write goes through a `SECURITY DEFINER` RPC that
  derives the acting user from `auth.uid()`. This matches the
  `connection_interactions` RPC-only model — a client cannot write the follow
  graph any other way.
- `follower_id` / `blocker_id` are always `auth.uid()` inside the RPC. There is
  no code path where a client-supplied user id becomes an owner column.

## Blocking is authoritative

When **A blocks B** (`block_user(B)`):

1. A row `blocks(blocker_id = A, blocked_id = B)` is inserted.
2. The `AFTER INSERT` trigger `blocks_clear_mutual_follow` deletes any
   `follows` row `(A → B)` **and** `(B → A)` in the same transaction.
3. Any later attempt to insert `follows (A → B)` or `(B → A)` is rejected by the
   `BEFORE INSERT` trigger `follows_enforce_not_blocked` (SQLSTATE `42501`).
4. `follow_user()` also checks for a block in either direction before inserting
   and raises `42501` ("This account is not available.") if one exists.

So the "A blocked B ⇒ no follow either way, existing edges removed, future
follows refused" rule holds regardless of how a row is inserted — the two
triggers enforce it at the table level, and the RPC enforces it at the API
level.

A future feed / messaging layer queries the relationship with:

```sql
-- Is there a block in either direction between :a and :b?
select exists (
  select 1 from public.blocks
  where (blocker_id = :a and blocked_id = :b)
     or (blocker_id = :b and blocked_id = :a)
);
```

Run inside a `SECURITY DEFINER` function (as `get_social_profile` does), because
a client can only read blocks where it is the `blocker_id`.

## Row Level Security

RLS is enabled on both tables with a revoke-first model.

### Grants

| Table | `anon` | `authenticated` |
| --- | --- | --- |
| `follows` | none | `select` only |
| `blocks` | none | `select` only |

No `insert` / `update` / `delete` on either table for any client role.

### Policies (all target `authenticated` only)

| Table | Command | Policy | Rule |
| --- | --- | --- | --- |
| `follows` | `select` | Authenticated users can read the follow graph | `using (true)` |
| `blocks` | `select` | Users can read their own blocks | `using (auth.uid() = blocker_id)` |

**Why `follows` is world-readable to members.** Follower / following counts and
lists are a normal public feature of a social profile (see `docs/DATA_MODEL.md`).
Making the graph readable keeps counts honest and the lists simple. The privacy
boundary is applied one level up: see the next section.

**Why `blocks` is private.** A user can see only the blocks *they* created.
"Who has blocked me" is never returned to a client directly. The RPCs apply it
server-side.

## Privacy: the block-aware profile boundary

`public.get_social_profile(p_username)` (`SECURITY DEFINER`, `stable`,
`search_path = ''`) is the single read path for a public profile and its social
state. It returns the viewer-relative shape
`{ id, username, display_name, bio, follower_count, following_count, is_self,
viewer_follows, viewer_blocked }` and behaves as follows:

| Situation | Result | What the page renders |
| --- | --- | --- |
| Username does not resolve to a completed profile | **no row** | `notFound()` |
| **The owner has blocked the viewer** | **no row** | `notFound()` |
| The viewer has blocked the owner | one row, `viewer_blocked = true`, `bio` / counts **null** | restrained "You blocked this account" + Unblock; no interests, no activity |
| Normal | one row with real counts and flags | full profile + Follow / Block |

### Decision: owner-blocked-viewer returns `notFound()`

When the profile owner has blocked the viewer, `get_social_profile` returns
**nothing**, and `/profile/<username>`, `/followers` and `/following` all call
`notFound()` — the same branded 404 a genuinely missing username produces. This
is the safest repo-consistent option (Connections and Prime history detail
already collapse "not yours / not found" to `notFound()`), and it leaks nothing:
the blocked viewer cannot even confirm the account exists, let alone see its
bio, interests, counts or follower lists.

The blocked viewer's own follow edge toward the owner was already removed when
the block was created, so no stale "Following" state survives.

### What the graph still exposes

The follow graph itself stays member-readable, so a determined viewer could see
"X follows Y" by loading a **third party's** follower list. This is intentional
and matches the data model (follow relationships are public). The block only
hides the blocking owner's *own* profile and lists from the blocked viewer, and
keeps the block record itself private. A stricter, fully block-filtered graph is
a deliberate future option, noted under "Remaining risks" in the pass report.

## RPCs

All five: `language plpgsql`, `security definer`, `set search_path = ''`, every
object schema-qualified, acting user from `auth.uid()`, `revoke all … from
public, anon` then `grant execute … to authenticated`.

| Function | Args | Returns | Behaviour |
| --- | --- | --- | --- |
| `follow_user` | `p_target_id uuid` | `void` | Auth required (`42501`). Reject null / self (`22023`). Target must be a completed-onboarding profile (`42501`). Reject if a block exists either direction (`42501`). `insert … on conflict do nothing` (idempotent). |
| `unfollow_user` | `p_target_id uuid` | `void` | Auth required. `delete from follows where follower_id = auth.uid() and following_id = p_target_id`. Idempotent. |
| `block_user` | `p_target_id uuid` | `void` | Auth required. Reject null / self (`22023`). Target must exist (`42501`). `insert … on conflict do nothing`; the trigger clears both follow edges. Idempotent. |
| `unblock_user` | `p_target_id uuid` | `void` | Auth required. `delete from blocks where blocker_id = auth.uid() and blocked_id = p_target_id`. Does **not** restore a cleared follow. Idempotent. |
| `get_social_profile` | `p_username text` | `table(...)` | See the table above. Normalises the username, rejects a malformed handle by returning no row. |

The two trigger functions (`enforce_follow_not_blocked`,
`clear_follows_on_block`) have `execute` revoked from `public, anon,
authenticated` — they run only from their triggers.

## Application / domain layer

Framework-free code under `src/lib/social/`:

| File | Responsibility |
| --- | --- |
| `social-validation.ts` | `isUuid`, `isValidUsername`, `checkSocialTarget` (invalid / self), and pagination: `parseFollowListPage` (strict base-10, clamps to `[1, 500]`), `getPagination`, `FOLLOW_LIST_PAGE_SIZE = 20`. |
| `social-labels.ts` | `formatCount`, `followerLabel` / `followingLabel`, `describeFollowRelationship`, `truncateBio`. Pure display copy. |
| `social-data.ts` | Typed reads: `getSocialProfile` (RPC wrapper, try/catch + error → `null`), `getFollowState`, `getFollowerCount` / `getFollowingCount`, `listFollowers` / `listFollowing` (two queries per page — the `follows` window then one `in(...)` profile lookup; no N+1). |
| `social-mutations.ts` | `followUser` / `unfollowUser` / `blockUser` / `unblockUser` — thin RPC wrappers returning `{ status, reason }`, mapping `42501` → `not_available`, `22023` → `invalid`, else logged + `unknown`. Never surfaces raw Postgres text. |
| `social-form-state.ts` | Plain module: `FollowActionState` / `BlockActionState` + initial-state builders (runtime values cannot be exported from a `"use server"` file). |

`src/lib/profile-validation.ts` — added `blocked`, `followers`, `following` to
`RESERVED_USERNAMES` so no handle can collide with a profile sub-route.

`src/types/database.ts` — added `Follow`, `Block`, `SocialProfileRow` row types;
`follows` / `blocks` as read-only `TableDefinition`s (Insert/Update
`Record<string, never>`, like `connection_interactions`); and the five RPC
signatures.

## Server actions

`app/(protected)/profile/[username]/actions.ts` — a `"use server"` module,
every export an async server action. `followProfile` / `unfollowProfile` /
`blockProfile` / `unblockProfile` each take the **target user id and username
bound as leading server arguments** (never form fields), run
`requireCompletedProfile()`, re-check `checkSocialTarget`, call the mutation
wrapper, then `revalidatePath` the affected profile routes (and the viewer's own
profile / following list). Errors return a safe generic message; the previous
relationship state is preserved on failure.

## Routes

| Route | File | Purpose |
| --- | --- | --- |
| `/profile/[username]` | `app/(protected)/profile/[username]/page.tsx` | Upgraded: keeps display name / username / bio / interests; adds follower & following counts (linked), Follow / Unfollow, Block / Unblock, or **Edit profile** on your own profile; restrained blocked state when you have blocked the owner. `notFound()` for a missing handle or when the owner has blocked you. |
| `/profile/[username]/followers` | `.../followers/page.tsx` | Paginated list of accounts following the owner. Empty state: "No followers yet." |
| `/profile/[username]/following` | `.../following/page.tsx` | Paginated list of accounts the owner follows. Empty state: "Not following anyone yet." |

Each list page reads `?page=` via `parseFollowListPage`, gates through
`getSocialProfile` first (so a blocked viewer gets `notFound()` / the "list
hidden" notice), and never shows private data — only public profile basics
(display name, `@username`, a truncated bio) and a link to the profile.

Components live in `src/components/social/`: `follow-button.tsx`,
`block-button.tsx` (with a confirm step), `person-card.tsx`, `person-list.tsx`,
`profile-social-panel.tsx`, `blocked-list-notice.tsx`.

## What is never exposed on a public profile

Email, private Prime reflections, Prime completion history, Connections and
their private notes, interaction history, and any auth metadata. The profile
page reads only `get_social_profile` (public fields + counts) and
`getInterestNames` (interest names of a completed profile, already
member-readable). Nothing else is queried.

## Verification SQL

Run in the Supabase SQL Editor after applying the migration.

### Tables exist with RLS

```sql
select relname, relrowsecurity
from pg_class
where oid in ('public.follows'::regclass, 'public.blocks'::regclass)
order by relname;
```

Both `relrowsecurity` must be `true`.

### Constraints

```sql
select conrelid::regclass as table, conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid in ('public.follows'::regclass, 'public.blocks'::regclass)
  and contype in ('c', 'u')
order by conrelid::regclass::text, conname;
```

Expect the `no_self` CHECKs and the `unique_pair` UNIQUEs on both tables.

### Grants — no writes for any client role

```sql
select table_name, privilege_type, grantee
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('follows', 'blocks')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

Expect **only** `SELECT` for `authenticated`, and **no rows** for `anon`.

### Policies

```sql
select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public' and tablename in ('follows', 'blocks')
order by tablename, cmd;
```

Expect one `select` policy each: `follows` → `qual = true`; `blocks` →
`qual` references `auth.uid() = blocker_id`. No other policies.

### Functions have the expected security settings

```sql
select p.proname, p.prosecdef as security_definer, p.provolatile as volatility,
       p.proconfig as config
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('follow_user','unfollow_user','block_user','unblock_user',
                    'get_social_profile','enforce_follow_not_blocked',
                    'clear_follows_on_block')
order by p.proname;
```

`security_definer = true` and `config = {search_path=""}` for all seven.
`get_social_profile` is `s` (stable); the rest are `v` (volatile).

### Execution privileges

```sql
select p.proname,
  has_function_privilege('authenticated', p.oid, 'execute') as auth_exec,
  has_function_privilege('anon', p.oid, 'execute')          as anon_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('follow_user','unfollow_user','block_user','unblock_user',
                    'get_social_profile','enforce_follow_not_blocked',
                    'clear_follows_on_block');
```

The four mutations + `get_social_profile`: `auth_exec = true`,
`anon_exec = false`. The two trigger functions: `false` for both.

### Triggers are attached

```sql
select tgrelid::regclass as table, tgname
from pg_trigger
where tgrelid in ('public.follows'::regclass, 'public.blocks'::regclass)
  and not tgisinternal
order by 1, 2;
```

Expect `follows_enforce_not_blocked` on `follows` and
`blocks_clear_mutual_follow` on `blocks`.

## Two-user authorization checks

Using Supabase clients authenticated separately as users **A** and **B**, both
with completed onboarding.

1. **A follows B** — `select public.follow_user('<B>')`. One `follows` row
   `(A → B)`. `get_social_profile('<B-username>')` as A shows
   `viewer_follows = true`, `follower_count = 1`.
2. **A unfollows, re-follows** — `unfollow_user('<B>')` then `follow_user('<B>')`
   both succeed; no duplicate row (`on conflict do nothing`).
3. **Self-follow rejected** — A calling `follow_user('<A>')` raises `22023`.
4. **B blocks A** — `block_user('<A>')`. The `(A → B)` follow row disappears
   immediately (trigger). `blocks` has one row `(B → A)`.
5. **A cannot follow B while blocked** — `follow_user('<B>')` as A raises
   `42501`. No row is written.
6. **B cannot follow A while B blocks A** — `follow_user('<A>')` as B also
   raises `42501` (block checked in both directions).
7. **A cannot see B's profile** — `get_social_profile('<B-username>')` as A
   returns **no row** while the block stands. In the app, `/profile/<B>` →
   `notFound()`.
8. **B still sees a restrained view of A** — `get_social_profile('<A-username>')`
   as B returns one row with `viewer_blocked = true`, `bio` and both counts
   `null`.
9. **B unblocks A** — `unblock_user('<A>')`. `follow_user` works again for both;
   the previously-cleared follow edge is **not** restored automatically.
10. **A cannot read B's blocks** — `select * from public.blocks` as A returns
    only rows where `blocker_id = A`, never B's block of A.
11. **Anon** — an unauthenticated client calling any of the five RPCs is
    rejected (no execute privilege / `Authentication is required.`).

## Manual browser verification

No further DB changes. Two completed-onboarding accounts, **A** and **B**. Sign
in as A unless noted.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `/profile/<B-username>` | B's profile: display name, `@username`, bio, interests, `0 followers` / `0 following`, a **Follow** button and a quiet **Block** control. No self-follow controls. |
| 2 | Click **Follow** | Button becomes **Following**. |
| 3 | Reload B's profile (or open it as B) | `follower_count` shows **1 follower**. |
| 4 | Open A's own profile (`/home` → `@username`, or `/profile/<A-username>`) | A shows **1 following**; **Edit profile** where the Follow button would be, no Follow/Block on own profile. |
| 5 | Back on B's profile, click **Following** | Reverts to **Follow**; B's follower count returns to 0. |
| 6 | Click **Follow** again | Works; no error, no duplicate. |
| 7 | Click **Block** → confirm | Profile switches to the restrained "You blocked this account" panel with **Unblock**; interests and the activity placeholder are gone; counts hidden. |
| 8 | As B, open `/profile/<A-username>` | B can still open A, but B's follow toward A (if any) is gone; the A→B follow is gone too. Check `/profile/<A>/followers` and `/following` as B — A no longer appears / A's edge removed. |
| 9 | As A, try `/profile/<B-username>` while the block stands | Branded **404** (`notFound()`), not an error page, no B data. |
| 10 | As A, try `/profile/<B-username>/followers` | Same branded 404. |
| 11 | As A, click **Unblock** on B's profile panel (reached via the blocked state) | Panel returns to counts + **Follow** / **Block**. |
| 12 | Follow B again, then open `/profile/<B-username>/followers` | A appears in the list with display name, `@username`, truncated bio, linking to `/profile/<A-username>`. |
| 13 | `/profile/<B-username>/following` with no follows | "Not following anyone yet." |
| 14 | Seed 25+ followers for a test account, open its `/followers` | 20 per page; **Next →** appears; `?page=2` shows the rest; **← Previous** returns. `?page=abc` / `?page=0` / `?page=-1` all render page 1. |
| 15 | Own profile `/profile/<A-username>` | **Edit profile** links to `/settings/profile`; no follow/block on self. |
| 16 | Anywhere on a profile | No email, no Prime reflections, no Connections, no private notes, no journal/goals, no auth metadata. |
| 17 | `/profile/definitely-not-a-user` and `/profile/x` (too short) | Branded 404. |
| 18 | 375 px viewport on `/profile/<username>`, `/followers`, `/following` | Single column, buttons wrap, cards full width, no horizontal scroll. |
| 19 | `/daily-prime`, `/daily-prime/history`, `/connections` | Unchanged and working — Pass 1 touched none of their code. |

## Rollback

Pass 1 is a single migration. To roll it back (destructive — deletes all follow
and block data; back up first):

```sql
begin;
drop function if exists public.get_social_profile(text);
drop function if exists public.follow_user(uuid);
drop function if exists public.unfollow_user(uuid);
drop function if exists public.block_user(uuid);
drop function if exists public.unblock_user(uuid);
drop table if exists public.blocks;   -- also drops the blocks_clear_mutual_follow trigger
drop table if exists public.follows;  -- also drops the follows_enforce_not_blocked trigger
drop function if exists public.clear_follows_on_block();
drop function if exists public.enforce_follow_not_blocked();
commit;
```

Dropping a table drops its triggers but not the trigger *functions*, so drop
those explicitly after the tables. Revert the app code that calls
`supabase.rpc("follow_user" | … | "get_social_profile")` and the
`/profile/[username]` upgrade first. Never drop `auth.users`.

After real members have built a graph, a forward corrective migration is safer
than a rollback.
