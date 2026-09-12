# Diong Data Model Proposal

This document describes the Diong data model. Phase 3 tables are implemented by `supabase/migrations/202607190001_onboarding_and_profiles.sql`; later entities remain proposals.

## Shared Assumptions

- Supabase Auth owns authentication users.
- Application tables reference `auth.users.id` through a `user_id` or equivalent owner field.
- Row Level Security should be enabled for user-owned and social tables.
- Private records must be readable only by their owner unless a later explicit sharing feature is added.
- Timestamps should be recorded for creation and updates.

## profiles (implemented)

- Purpose: Store the authenticated user's public profile and onboarding state.
- Fields: `id`, `username`, `display_name`, `bio`, `avatar_url`, `onboarding_completed`, `created_at`, `updated_at`.
- Relationship: `id` is both the primary key and a cascading foreign key to `auth.users.id`.
- Privacy: Authenticated users can read public profile rows. Owners alone can insert/repair and update their row. Email and auth metadata remain in Supabase Auth.
- Validation: Completed profiles require a normalized 3–30 character username and display name. Usernames allow lowercase letters, numbers and underscores. Display names are 1–60 characters and bios at most 300.
- Lifecycle: A secure auth trigger creates the minimum row. The migration idempotently repairs missing rows. Atomic onboarding is performed by `complete_onboarding` under the authenticated user's RLS context.

## interests (implemented)

- Purpose: Maintain the controlled onboarding interest catalog.
- Fields: `id`, `slug`, `name`, `description`, `sort_order`, `is_active`, `created_at`.
- Privacy: Authenticated users can read active rows. Normal users cannot write catalog data.
- Seed: Twelve initial interests are inserted by the Phase 3 migration.

## user_interests (implemented)

- Purpose: Join authenticated users to the controlled interests catalog.
- Fields: `user_id`, `interest_id`, `created_at`; `(user_id, interest_id)` is the primary key.
- Privacy: Owners can read and manage their selections. Authenticated users can also read selections belonging to completed profiles so profile pages can show interest names; incomplete selections stay owner-only.
- Validation: Onboarding requires 1–5 unique active interests and saves them in one transaction.

## prime_protocols

- Purpose: Store reusable Prime Protocol content.
- Important fields: `id`, `title`, `category`, `purpose`, `best_time`, `prime_text`, `action_trigger`, `tomorrows_expectation`, `reflection_prompt`, `status`, `created_at`, `updated_at`.
- Relationship to users: Content is global; may later include `created_by` for admin users.
- Privacy requirements: Published protocols can be readable by authenticated users; drafts restricted to admins.
- Useful indexes: `status`; `category`; `created_at`.
- Validation rules: Title, category, prime text, and action trigger required for published protocols.

## prime_assignments

- Purpose: Assign a Daily Prime Protocol to a user for a specific date.
- Important fields: `id`, `user_id`, `prime_protocol_id`, `assigned_date`, `created_at`.
- Relationship to users: Many assignments belong to one user; each assignment references one protocol.
- Privacy requirements: Readable only by the assigned user and service/admin contexts.
- Useful indexes: `user_id`; `assigned_date`; unique `(user_id, assigned_date)`.
- Validation rules: One assignment per user per day; assigned protocol must be published.

## prime_completions

- Purpose: Record Action Trigger completion for a Prime assignment.
- Important fields: `id`, `user_id`, `prime_assignment_id`, `completed_at`, `completion_date`, `note`.
- Relationship to users: Many completions belong to one user; each completion references one assignment.
- Privacy requirements: Private to the user.
- Useful indexes: `user_id`; `completion_date`; unique `(user_id, prime_assignment_id)`.
- Validation rules: Prevent duplicate completion for the same assignment; optional note length limit.

## journal_entries

- Purpose: Store private user reflections.
- Important fields: `id`, `user_id`, `title`, `body`, `entry_date`, `prime_assignment_id`, `goal_id`, `habit_id`, `created_at`, `updated_at`.
- Relationship to users: Many entries belong to one user; optional links to user's own Prime assignment, goal, or habit.
- Privacy requirements: Strictly private to owner.
- Useful indexes: `user_id`; `(user_id, entry_date)`; `prime_assignment_id`.
- Validation rules: Body required; title optional with length limit; linked records must belong to same user.

## goals

- Purpose: Store personal goals.
- Important fields: `id`, `user_id`, `title`, `description`, `status`, `target_date`, `completed_at`, `archived_at`, `created_at`, `updated_at`.
- Relationship to users: Many goals belong to one user.
- Privacy requirements: Private to owner in MVP.
- Useful indexes: `user_id`; `(user_id, status)`; `target_date`.
- Validation rules: Title required; status from allowed values; target date optional.

## goal_updates

- Purpose: Store progress notes for goals.
- Important fields: `id`, `user_id`, `goal_id`, `body`, `created_at`, `updated_at`.
- Relationship to users: Many updates belong to one goal and one user.
- Privacy requirements: Private to owner in MVP.
- Useful indexes: `goal_id`; `user_id`; `created_at`.
- Validation rules: Body required; goal must belong to same user.

## habits

- Purpose: Store habit definitions.
- Important fields: `id`, `user_id`, `name`, `description`, `cadence`, `is_active`, `created_at`, `updated_at`.
- Relationship to users: Many habits belong to one user.
- Privacy requirements: Private to owner in MVP.
- Useful indexes: `user_id`; `(user_id, is_active)`.
- Validation rules: Name required; cadence from allowed values; active habits can be logged.

## habit_logs

- Purpose: Record habit completions by date.
- Important fields: `id`, `user_id`, `habit_id`, `log_date`, `completed_at`, `note`.
- Relationship to users: Many logs belong to one habit and one user.
- Privacy requirements: Private to owner.
- Useful indexes: `habit_id`; `(user_id, log_date)`; unique `(habit_id, log_date)`.
- Validation rules: Prevent duplicate logs for same habit/date; habit must belong to same user.

## posts (implemented)

- Implemented by `supabase/migrations/202609100003_social_content.sql` (Social
  Network Pass 2). See `docs/SOCIAL_CONTENT.md`.
- Purpose: Store user-created posts for the growth feed.
- Fields: `id`, `user_id`, `post_type`, `body`, `visibility`, `created_at`,
  `updated_at`, `edited_at`, `deleted_at`.
- Relationship to users: Many posts belong to one user (`user_id → auth.users`,
  cascade). Not client-writable.
- Privacy: `public` (any member, no block), `followers` (author's followers, no
  block), `private` (author only). Soft-deleted posts are invisible to everyone.
  Enforced by `public.viewer_can_see_post()`, the `posts` RLS `select` policy
  and every read RPC.
- Indexes: partial (`where deleted_at is null`) on `(user_id, created_at desc)`,
  `(created_at desc, id desc)`, `(visibility, created_at desc)`.
- Validation: `post_type` and `visibility` CHECKed against fixed lists; body
  trimmed, 1–5000 chars; plain text only. Writes are RPC-only (`create_post` /
  `update_post` / `soft_delete_post`).

## post_comments (implemented)

- Implemented by `supabase/migrations/202609100003_social_content.sql`.
- Purpose: Comments and one reply level on a post.
- Fields: `id`, `post_id`, `user_id`, `parent_comment_id`, `body`, `created_at`,
  `updated_at`, `edited_at`, `deleted_at`.
- Privacy: Readable when the parent post is visible to the viewer and no block
  stands between the viewer and the comment author. Deleted comments are never
  returned with a body.
- Indexes: `(post_id, created_at)`; `(parent_comment_id) where not null`;
  `(user_id)`.
- Validation: body trimmed, 1–2000 chars; one reply level enforced by a
  composite FK (`same post`) + the `post_comments_enforce_one_level` trigger
  (`parent is a root`) + the `create_comment` RPC. Writes are RPC-only.

## post_likes (implemented)

- Implemented by `supabase/migrations/202609100003_social_content.sql`.
- Purpose: Store likes on posts (like only — no reaction types).
- Fields: `user_id`, `post_id`, `created_at`. Primary key `(user_id, post_id)`.
- Privacy: A member reads only their own like rows (RLS). Counts come from the
  read RPCs, never row-by-row.
- Indexes: primary key `(user_id, post_id)`; `(post_id)` for counts.
- Validation: primary key prevents duplicates; `like_post` requires a visible,
  unblocked post and is idempotent. Writes are RPC-only.

## post_bookmarks (implemented)

- Implemented by `supabase/migrations/202609100003_social_content.sql`.
- Purpose: A member's private "saved for later" list.
- Fields: `user_id`, `post_id`, `created_at`. Primary key `(user_id, post_id)`.
- Privacy: **Owner-only** — RLS `select` is `user_id = auth.uid()`, and only
  `list_bookmarks` (running as the owner) returns them. A now-invisible post is
  dropped from `/saved`, never exposed.
- Indexes: primary key `(user_id, post_id)`; `(user_id, created_at desc)` for
  the saved order.
- Validation: primary key prevents duplicates; `bookmark_post` requires a
  visible, unblocked post and is idempotent. Writes are RPC-only.

## follows (implemented)

- Implemented by `supabase/migrations/202609100002_social_graph.sql` (Social
  Network Pass 1). See `docs/SOCIAL_GRAPH_SETUP.md`.
- Purpose: Store follower relationships between users.
- Fields: `id`, `follower_id`, `following_id`, `created_at`.
- Relationship to users: Both fields reference `auth.users(id)` with
  `on delete cascade`.
- Privacy: The follow graph is readable by any signed-in member (counts and
  lists are a normal profile feature). The block-aware boundary is applied by
  `public.get_social_profile()` — a member the owner has blocked cannot resolve
  the owner's profile or lists.
- Indexes: `unique (follower_id, following_id)` (also serves the "following"
  list); `follows_following_id_idx` on `(following_id)` for the "followers"
  list.
- Validation: `check (follower_id <> following_id)`; unique pair prevents
  duplicates; a `BEFORE INSERT` trigger refuses a follow when a block exists in
  either direction. Writes are RPC-only (`follow_user` / `unfollow_user`); there
  is no direct `insert`/`update`/`delete` grant.

## blocks (implemented)

- Implemented by `supabase/migrations/202609100002_social_graph.sql` (Social
  Network Pass 1).
- Purpose: Let a member block another member — no follow either direction, and a
  privacy boundary later layers (feed, messages) can query.
- Fields: `id`, `blocker_id`, `blocked_id`, `created_at`.
- Relationship to users: Both reference `auth.users(id)` with
  `on delete cascade`.
- Privacy: A member can read only the blocks **they** created
  (`select` policy `auth.uid() = blocker_id`). "Who blocked me" is applied
  server-side inside the RPCs, never returned to a client.
- Indexes: `unique (blocker_id, blocked_id)`; `blocks_blocker_id_idx`;
  `blocks_blocked_id_idx`.
- Validation: `check (blocker_id <> blocked_id)`; unique pair. An `AFTER INSERT`
  trigger deletes any follow edge in either direction. Writes are RPC-only
  (`block_user` / `unblock_user`).

## notifications (implemented)

- Implemented by
  `supabase/migrations/202609100004_notifications_discover_search.sql`
  (Social Network Pass 3). See `docs/NOTIFICATIONS_DISCOVER_SEARCH.md`.
- Purpose: Store in-app notifications for new followers, post likes, post
  comments and comment replies.
- Fields: `id`, `user_id`, `actor_user_id`, `notification_type`,
  `entity_type`, `entity_id`, `read_at`, `created_at`.
- Relationship to users: `user_id → auth.users` (cascade, the recipient),
  `actor_user_id → auth.users` (`on delete set null`, the account whose
  action produced the notification). Not client-writable — rows are created
  only by `AFTER INSERT` triggers on `follows` / `post_likes` /
  `post_comments`.
- Privacy: Readable only by the recipient (RLS `user_id = auth.uid()`). A
  notification whose actor is now blocked in either direction is hidden
  entirely by the read RPCs; a notification whose target was later
  soft-deleted is still shown (the sentence never contains post/comment
  body) but its link becomes non-navigable. Never exposes private journal,
  goal, habit, Connections or Prime-reflection data — none of that exists as
  a notification source.
- Indexes: `(user_id, created_at desc)`; `(user_id, read_at, created_at
  desc)`; `(actor_user_id)`.
- Validation: `notification_type` / `entity_type` CHECKed against fixed
  lists; a combined CHECK ties each type to its exact entity shape; actor can
  never equal recipient. `entity_id` is intentionally not foreign-keyed
  (polymorphic across posts/comments — see the doc). Writes are trigger- and
  RPC-only (`mark_notification_read` / `mark_all_notifications_read` for read
  state; no client insert/update/delete grant exists at all).

## communities (implemented)

- Implemented by `supabase/migrations/202609120003_communities.sql` (Social
  Network Pass 5). See `docs/COMMUNITIES_MODERATION.md`.
- Purpose: A public topic community.
- Fields: `id`, `owner_id`, `slug`, `name`, `description`, `rules`,
  `created_at`, `updated_at`, `is_active`.
- Relationship to users: `owner_id → auth.users` (cascade). Always
  `auth.uid()` at creation time — never client-supplied.
- Privacy: Public in V1 — any authenticated member can read an active
  (`is_active`) row. Writes are RPC-only (`create_community`); there is no
  client insert/update/delete grant.
- Indexes: `(slug)`; `(created_at desc, id desc)`.
- Validation: name 2–80 characters; slug unique, lowercase letters/digits/
  single hyphens, 3–60 characters; description ≤ 2000 characters; rules
  ≤ 5000 characters.

## community_members (implemented)

- Implemented by `supabase/migrations/202609120003_communities.sql`.
- Purpose: Membership and role (`owner` / `moderator` / `member`) of a user
  in a community.
- Fields: `community_id`, `user_id`, `role`, `joined_at`. Primary key
  `(community_id, user_id)`.
- Relationship to users: `user_id → auth.users` (cascade);
  `community_id → communities` (cascade).
- Privacy: Public alongside its (active) community — any authenticated
  member can read. Writes are RPC-only (`create_community` /
  `join_community` insert; `leave_community` / `remove_community_member` /
  `ban_community_member` delete; `promote_community_moderator` /
  `demote_community_moderator` update `role`). Role is
  database-authoritative — the browser cannot assign or forge a role.
- Indexes: primary key `(community_id, user_id)`; `(user_id)`;
  `(community_id, role)`.
- Validation: `role` CHECKed against `('owner', 'moderator', 'member')`. The
  owner recorded at creation can never leave, be removed, demoted or banned
  (enforced inside every relevant RPC, not just the UI).

## community_post_links (implemented)

- Implemented by `supabase/migrations/202609120003_communities.sql`.
- Purpose: Links one `public.posts` row to the community it was shared into;
  reuses the existing post model rather than forking a second one.
- Fields: `community_id`, `post_id` (unique — a post belongs to at most one
  community), `author_id`, `created_at`, `removed_at`, `removed_by`,
  `removal_reason`. Primary key `(community_id, post_id)`.
- Relationship to users: `author_id` / `removed_by → auth.users`
  (cascade / set null).
- Privacy: A live (`removed_at is null`) link on an active community is
  readable by any authenticated member. Writes are RPC-only
  (`create_community_post` inserts; `remove_community_post` stamps
  `removed_at`/`removed_by`/`removal_reason` — the underlying post is never
  touched). Moderator "removal" removes the post from the community only;
  the post keeps its normal Diong visibility everywhere else.
- Indexes: primary key `(community_id, post_id)`; unique `(post_id)`;
  `(community_id, created_at desc)`.
- Validation: `removal_reason` ≤ 500 characters. A community post is always
  created with `visibility = 'public'`.

## community_bans (implemented)

- Implemented by `supabase/migrations/202609120003_communities.sql`.
- Purpose: A community-scoped ban — distinct from the global user block
  (`public.blocks`). Blocks joining or posting in one community only; never
  affects the global follow/block graph, direct messages, or any other
  community.
- Fields: `community_id`, `user_id`, `banned_by`, `reason`, `created_at`.
  Primary key `(community_id, user_id)`.
- Relationship to users: `user_id → auth.users` (cascade);
  `banned_by → auth.users` (set null).
- Privacy: **No client select grant at all** — read only inside
  `SECURITY DEFINER` RPCs (`is_community_banned`, `list_community_bans`),
  the same pattern `blocked_between()` uses for `public.blocks`. Writes are
  RPC-only (`ban_community_member` inserts; `unban_community_member`
  deletes — unbanning does not restore membership).
- Indexes: primary key `(community_id, user_id)`;
  `(community_id, user_id)`.
- Validation: `reason` ≤ 500 characters; never targets the community owner.

## reports (implemented)

- Implemented by `supabase/migrations/202609120003_communities.sql`.
- Purpose: A general report against a post, comment, profile, community, or
  community post.
- Fields: `id`, `reporter_id`, `target_type`, `target_id`, `target_user_id`,
  `reason`, `details`, `status`, `created_at`.
- Relationship to users: `reporter_id → auth.users` (cascade). Always
  `auth.uid()` — never client-supplied. `target_user_id → auth.users`
  (cascade), used only when `target_type = 'profile'`.
- Privacy: **No client select grant at all** — read only inside
  `SECURITY DEFINER` RPCs (`list_community_moderation_reports`, scoped to
  one community's own community/community-post reports; never selects
  `reporter_id`, so reporter identity is not exposed even to community
  moderators). Writes are RPC-only (`create_report`); there is no client
  insert/update/delete grant. A duplicate open report against the same
  target silently no-ops rather than erroring or revealing duplication.
- Indexes: `(target_type, target_id)`; `(status, created_at desc)`; a
  partial unique index on `(reporter_id, target_type,
  coalesce(target_id, -1), coalesce(target_user_id, <nil uuid>)) where
  status = 'open'`.
- Validation: `target_type` CHECKed against `('post', 'comment', 'profile',
  'community', 'community_post')`; `reason` CHECKed against a fixed list;
  `status` CHECKed against `('open', 'reviewed', 'actioned', 'dismissed')`;
  a combined CHECK (`reports_target_shape`) ties `target_type` to exactly
  one of `target_id` (bigint targets) or `target_user_id` (profile target)
  being set; `details` ≤ 2000 characters. In-app status changes (review /
  action / dismiss) are not yet implemented — deferred past Pass 5.
