# Diong Data Model Proposal

This document proposes first database entities and relationships for Supabase PostgreSQL. It does not define SQL migrations.

## Shared Assumptions

- Supabase Auth owns authentication users.
- Application tables reference `auth.users.id` through a `user_id` or equivalent owner field.
- Row Level Security should be enabled for user-owned and social tables.
- Private records must be readable only by their owner unless a later explicit sharing feature is added.
- Timestamps should be recorded for creation and updates.

## profiles

- Purpose: Store public and account-adjacent profile information for each user.
- Important fields: `id`, `user_id`, `username`, `display_name`, `bio`, `avatar_url`, `onboarding_completed_at`, `created_at`, `updated_at`.
- Relationship to users: One profile belongs to one auth user.
- Privacy requirements: Username, display name, bio, avatar, and public post association can be visible to authenticated users; account email remains in auth, not profile.
- Useful indexes: Unique `user_id`; unique lowercase `username`; index `username`.
- Validation rules: Username required after onboarding; username length and character limits; display name length limit; bio length limit.

## user_interests

- Purpose: Store onboarding goal-interest selections.
- Important fields: `id`, `user_id`, `interest_key`, `created_at`.
- Relationship to users: Many interests belong to one user.
- Privacy requirements: Private to the user unless later used only in aggregate internally.
- Useful indexes: `user_id`; unique `(user_id, interest_key)`.
- Validation rules: `interest_key` must come from an allowed list; prevent duplicates.

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

## posts

- Purpose: Store user-created community posts.
- Important fields: `id`, `user_id`, `body`, `visibility`, `created_at`, `updated_at`, `deleted_at`.
- Relationship to users: Many posts belong to one user.
- Privacy requirements: Public-to-authenticated in MVP when visibility is community; deleted posts hidden.
- Useful indexes: `user_id`; `created_at`; `(visibility, created_at)`.
- Validation rules: Body required; length limit; no automatic inclusion of private journal, goal, or habit content.

## comments

- Purpose: Store comments on posts.
- Important fields: `id`, `post_id`, `user_id`, `body`, `created_at`, `updated_at`, `deleted_at`.
- Relationship to users: Many comments belong to one user and one post.
- Privacy requirements: Visible to authenticated users who can view the parent post.
- Useful indexes: `post_id`; `user_id`; `created_at`.
- Validation rules: Body required; length limit; parent post must be visible and not deleted.

## post_likes

- Purpose: Store likes on posts.
- Important fields: `id`, `post_id`, `user_id`, `created_at`.
- Relationship to users: Many likes belong to one user and one post.
- Privacy requirements: Like counts visible with posts; individual like records can be visible only as needed.
- Useful indexes: `post_id`; `user_id`; unique `(post_id, user_id)`.
- Validation rules: Prevent duplicate likes; parent post must be visible and not deleted.

## follows

- Purpose: Store follower relationships between users.
- Important fields: `id`, `follower_user_id`, `following_user_id`, `created_at`.
- Relationship to users: Both fields reference auth users or profiles.
- Privacy requirements: Follow counts and relationships can be visible in MVP unless later made configurable.
- Useful indexes: `follower_user_id`; `following_user_id`; unique `(follower_user_id, following_user_id)`.
- Validation rules: Users cannot follow themselves; prevent duplicate follows.

## notifications

- Purpose: Store basic in-app notifications.
- Important fields: `id`, `user_id`, `actor_user_id`, `type`, `post_id`, `comment_id`, `read_at`, `created_at`.
- Relationship to users: Notification belongs to recipient user; optional actor user and related content.
- Privacy requirements: Readable only by recipient; must not expose private journal, goal, habit, or completion data.
- Useful indexes: `user_id`; `(user_id, read_at)`; `created_at`.
- Validation rules: Type from allowed values; related content must match notification type; recipient cannot be null.
