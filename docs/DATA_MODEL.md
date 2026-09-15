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
- Fields: `id`, `username`, `display_name`, `bio`, `avatar_url`, `avatar_path`,
  `cover_path`, `onboarding_completed`, `created_at`, `updated_at`.
- Relationship: `id` is both the primary key and a cascading foreign key to `auth.users.id`.
- Privacy: Authenticated users can read public profile rows. Owners alone can insert/repair and update their row. Email and auth metadata remain in Supabase Auth.
- Validation: Completed profiles require a normalized 3–30 character username and display name. Usernames allow lowercase letters, numbers and underscores. Display names are 1–60 characters and bios at most 300.
- Lifecycle: A secure auth trigger creates the minimum row. The migration idempotently repairs missing rows. Atomic onboarding is performed by `complete_onboarding` under the authenticated user's RLS context.
- Media (Pass 7 — `avatar_path` / `cover_path`, added by
  `supabase/migrations/202609130002_media_profile_polish.sql`, **not yet
  applied**): relative Supabase Storage paths
  (`profiles/{userId}/avatar|cover/{uuid}.{ext}`) in the public
  `diong-public-media` bucket, never a full URL. `avatar_url` predates Pass 7,
  was never wired to an upload path, and is left untouched. See
  `docs/MEDIA_PROFILE_STORAGE.md`.

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

## goals (implemented)

- Implemented by `supabase/migrations/202609130001_goals_habits_journal.sql`
  (Pass 6). See `docs/GOALS_HABITS_JOURNAL.md`.
- Purpose: A private personal goal.
- Fields: `id`, `user_id`, `title`, `description`, `category`, `status`,
  `target_date`, `progress_percent`, `created_at`, `updated_at`,
  `completed_at`.
- Relationship to users: `user_id → auth.users` (cascade). Strictly
  owner-only — no shared or public read path.
- Privacy: Owner-only `select`/`insert`/`update`; no `delete` grant at all —
  a goal is archived (`status = 'archived'`), never hard-deleted.
- Indexes: `(user_id, status, created_at desc)`; unique `(id, user_id)`
  (the composite-FK target for `goal_milestones`).
- Validation: title 1–120 chars; description ≤ 3000; category 1–60 chars
  when present; `status` CHECKed against `active`/`paused`/`completed`/
  `archived`; `progress_percent` 0–100; a CHECK
  (`goals_completed_progress_full`) ties `status = 'completed'` to
  `progress_percent = 100`. `completed_at` is system-managed by the
  `apply_goal_completion_status()` trigger — never client-writable.

## goal_milestones (implemented)

- Implemented by `supabase/migrations/202609130001_goals_habits_journal.sql`.
- Purpose: An ordered, togglable step within a goal.
- Fields: `id`, `goal_id`, `user_id`, `title`, `position`, `is_completed`,
  `completed_at`, `created_at`.
- Relationship to users: Composite foreign key `(goal_id, user_id) →
  goals(id, user_id)` — a milestone's ownership is structurally guaranteed
  to match its goal's owner. `on delete cascade`.
- Privacy: Owner-only `select`. Read-only for clients otherwise — rows are
  created only by `add_goal_milestone()` and changed only by
  `toggle_goal_milestone()` (both `SECURITY DEFINER` RPCs); there is no
  direct `insert`/`update`/`delete` grant.
- Indexes: `(goal_id, position)`.
- Validation: title 1–200 chars; `position` is always server-computed
  (`max(position) + 1`), never client-supplied.

## habits (implemented)

- Implemented by `supabase/migrations/202609130001_goals_habits_journal.sql`.
- Purpose: A private, repeatable habit definition.
- Fields: `id`, `user_id`, `name`, `description`, `frequency`,
  `target_per_period`, `is_active`, `created_at`, `updated_at`,
  `archived_at`.
- Relationship to users: `user_id → auth.users` (cascade).
- Privacy: Owner-only `select`/`insert`/`update`; no `delete` grant — a
  habit is archived (`is_active = false`), never hard-deleted.
- Indexes: `(user_id, is_active)`; unique `(id, user_id)` (the
  composite-FK target for `habit_checkins`).
- Validation: name 1–120 chars; description ≤ 1000; `frequency` CHECKed
  against `daily`/`weekly` only (V1 avoids custom schedules);
  `target_per_period` 1–100. `archived_at` is system-managed by the
  `apply_habit_archived_at()` trigger — never client-writable.

## habit_checkins (implemented)

- Implemented by `supabase/migrations/202609130001_goals_habits_journal.sql`.
- Purpose: One check-in for one habit on one calendar date.
- Fields: `id`, `habit_id`, `user_id`, `checkin_date`, `value`, `note`,
  `created_at`.
- Relationship to users: Composite foreign key `(habit_id, user_id) →
  habits(id, user_id)` — a check-in's ownership is structurally guaranteed
  to match its habit's owner. `on delete cascade`.
- Privacy: Owner-only `select`. Read-only for clients otherwise — rows are
  created/updated only by `check_in_habit()` and removed only by
  `undo_habit_checkin()` (both `SECURITY DEFINER` RPCs, upserting on
  conflict so a same-day correction never needs an explicit undo first).
- Indexes: `(habit_id, checkin_date desc)`; `(user_id, checkin_date desc)`;
  unique `(habit_id, checkin_date)` — one row per habit per day.
- Validation: `value` 1–1000 (default 1 — a plain "done today" tap); `note`
  ≤ 500 chars when present; a future `checkin_date` is rejected by the RPC.
  Streak calculation (current/longest, daily or weekly) is pure TypeScript
  (`src/lib/habits/habit-streak.ts`), not stored or computed in SQL.

## journal_entries (implemented)

- Implemented by `supabase/migrations/202609130001_goals_habits_journal.sql`.
- Purpose: A strictly private journal entry, optionally linked to one goal,
  one habit and/or one Daily Prime assignment.
- Fields: `id`, `user_id`, `title`, `body`, `mood`, `entry_date`, `goal_id`,
  `habit_id`, `prime_assignment_id`, `created_at`, `updated_at`.
- Relationship to users: `user_id → auth.users` (cascade). `goal_id` /
  `habit_id` / `prime_assignment_id` are plain single-column foreign keys
  (`on delete set null`) to `goals(id)` / `habits(id)` /
  `prime_assignments(id)`; same-owner integrity for all three is enforced
  by the `enforce_journal_entry_ownership()` `BEFORE INSERT OR UPDATE`
  trigger (a `42501` error if a linked id belongs to a different user),
  not by a composite foreign key.
- Privacy: Strictly owner-only `select`/`insert`/`update`/`delete` — the one
  table in this pass with a `delete` grant; nothing else references a
  journal entry, so a confirmed, owner-only hard delete is safe. Never
  surfaced in the feed, Discover, global Search, a public profile,
  communities or messages.
- Indexes: `(user_id, entry_date desc)`.
- Validation: body 1–10000 chars; title 1–200 chars when present; `mood`
  CHECKed against a fixed, self-reported, non-diagnostic list (`calm`,
  `focused`, `energised`, `neutral`, `stressed`, `low`, `grateful`,
  `reflective`) or `null`.

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

## post_media

- Implemented by `supabase/migrations/202609130002_media_profile_polish.sql`
  (Pass 7). Applied — see `docs/MEDIA_PROFILE_STORAGE.md`.
- Purpose: Up to 4 images attached to one post.
- Fields: `id`, `post_id`, `user_id`, `storage_path`, `mime_type`,
  `size_bytes`, `width`, `height`, `position`, `alt_text`, `created_at`.
- Relationship to users: `post_id → posts` (cascade), `user_id → auth.users`
  (cascade); a `BEFORE INSERT OR UPDATE` trigger
  (`enforce_post_media_ownership`) additionally guarantees `user_id` always
  matches the owning post's author, independent of the RPC's own check.
- Privacy: Readable when the parent post is visible to the viewer
  (`public.viewer_can_see_post(post_id)`) — identical visibility rule as the
  post's own text. **No client select grant beyond that policy**; writes are
  RPC-only (`attach_post_media()` re-validates post ownership, MIME type,
  size and the 4-image ceiling; `remove_post_media()` is owner-only and
  returns the deleted row's `storage_path` for Storage cleanup).
- Indexes: `(post_id, position)`; `(user_id, created_at desc)`.
- Validation: `mime_type` CHECKed to `image/jpeg` / `image/png` /
  `image/webp`; `size_bytes` 1–6291456 (6 MB); `position` non-negative;
  `alt_text` ≤ 300 characters; `storage_path` non-blank and unique; unique
  `(post_id, position)` — one row per display slot.

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
  `created_at`, `updated_at`, `is_active`, `avatar_path`, `cover_path`.
- Relationship to users: `owner_id → auth.users` (cascade). Always
  `auth.uid()` at creation time — never client-supplied.
- Privacy: Public in V1 — any authenticated member can read an active
  (`is_active`) row. Writes are RPC-only (`create_community`); there is no
  client insert/update/delete grant.
- Indexes: `(slug)`; `(created_at desc, id desc)`.
- Validation: name 2–80 characters; slug unique, lowercase letters/digits/
  single hyphens, 3–60 characters; description ≤ 2000 characters; rules
  ≤ 5000 characters.
- Media (Pass 7 — `avatar_path` / `cover_path`, added by
  `supabase/migrations/202609130002_media_profile_polish.sql`, **not yet
  applied**): relative Storage paths
  (`communities/{ownerUserId}/{communityId}/avatar|cover/{uuid}.{ext}`),
  writable only by the community **owner** via `set_community_avatar()` /
  `set_community_cover()` (`SECURITY DEFINER`, owner-only re-check) — a
  moderator gains no branding authority. See `docs/MEDIA_PROFILE_STORAGE.md`.

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
