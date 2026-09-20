export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// avatar_url predates Pass 7 and is unused by the application — avatar_path /
// cover_path are the Pass 7 Supabase Storage-backed columns.
export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
  cover_path: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type Interest = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type UserInterest = {
  user_id: string;
  interest_id: number;
  created_at: string;
};

export type PrimeCategory = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  interest_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type PrimeProtocol = {
  id: number;
  category_id: number;
  slug: string;
  title: string;
  purpose: string | null;
  best_time: string | null;
  prime_text: string;
  action_trigger: string;
  tomorrows_expectation: string | null;
  reflection_prompt: string | null;
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
};

export type PrimeAssignment = {
  id: number;
  user_id: string;
  prime_protocol_id: number;
  assigned_date: string;
  created_at: string;
};

export type PrimeCompletion = {
  id: number;
  user_id: string;
  prime_assignment_id: number;
  completion_date: string;
  completed_at: string;
  note: string | null;
  reflection: string | null;
};

export type DailyPrime = {
  assignment_id: number;
  assigned_date: string;
  protocol_id: number;
  category_name: string;
  title: string;
  purpose: string | null;
  best_time: string | null;
  prime_text: string;
  action_trigger: string;
  tomorrows_expectation: string | null;
  reflection_prompt: string | null;
  completed_at: string | null;
};

export type ConnectionType =
  | "friend"
  | "family"
  | "mentor"
  | "accountability_partner"
  | "colleague"
  | "professional_contact"
  | "collaborator"
  | "study_partner"
  | "community"
  | "coach_adviser"
  | "other";

export type ConnectionPurpose =
  | "career_growth"
  | "accountability"
  | "learning"
  | "friendship"
  | "family"
  | "collaboration"
  | "networking"
  | "support"
  | "shared_goal"
  | "community"
  | "personal_growth"
  | "other";

export type ConnectionInteractionType =
  | "message"
  | "call"
  | "video"
  | "in_person"
  | "email"
  | "other";

export type Connection = {
  id: number;
  user_id: string;
  name: string;
  connection_type: ConnectionType;
  connection_purpose: ConnectionPurpose;
  why_it_matters: string | null;
  preferred_contact_days: number | null;
  last_meaningful_contact_at: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ConnectionInteraction = {
  id: number;
  user_id: string;
  connection_id: number;
  interaction_type: ConnectionInteractionType;
  occurred_at: string;
  notes: string | null;
  created_at: string;
};

export type ConnectionNudgeStatus =
  | "due"
  | "approaching"
  | "up_to_date"
  | "never_contacted";

// Row shape returned by public.get_connection_nudges().
export type ConnectionNudge = {
  connection_id: number;
  name: string;
  connection_type: ConnectionType;
  connection_purpose: ConnectionPurpose;
  last_meaningful_contact_at: string | null;
  preferred_contact_days: number | null;
  days_since: number | null;
  status: ConnectionNudgeStatus;
};

// Row shape returned by public.record_connection_interaction().
export type RecordedConnectionInteraction = {
  interaction_id: number;
  connection_id: number;
  occurred_at: string;
  last_meaningful_contact_at: string;
};

// ---------------------------------------------------------------------------
// Social graph (follows / blocks) — Social Network Pass 1
// ---------------------------------------------------------------------------

export type Follow = {
  id: number;
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type Block = {
  id: number;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

// Row shape returned by public.get_social_profile(). `bio`, `follower_count`
// and `following_count` are null when the viewer has blocked the profile owner.
// The function returns no row at all when the owner has blocked the viewer.
export type SocialProfileRow = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  follower_count: number | null;
  following_count: number | null;
  is_self: boolean;
  viewer_follows: boolean;
  viewer_blocked: boolean;
  avatar_path: string | null;
  cover_path: string | null;
};

// ---------------------------------------------------------------------------
// Social content (posts / comments / likes / bookmarks) — Social Network Pass 2
// ---------------------------------------------------------------------------

export type PostType =
  | "update"
  | "reflection"
  | "progress"
  | "learning"
  | "achievement"
  | "question"
  | "resource";

export type PostVisibility = "public" | "followers" | "private";

export type Post = {
  id: number;
  user_id: string;
  post_type: PostType;
  body: string;
  visibility: PostVisibility;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

export type PostComment = {
  id: number;
  post_id: number;
  user_id: string;
  parent_comment_id: number | null;
  body: string;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

export type PostLike = {
  user_id: string;
  post_id: number;
  created_at: string;
};

export type PostBookmark = {
  user_id: string;
  post_id: number;
  created_at: string;
};

// One image attached to a post (Pass 7). Returned inline as a jsonb array by
// every post-row RPC — never fetched with a separate per-post query.
export type PostMediaItem = {
  id: number;
  storage_path: string;
  width: number | null;
  height: number | null;
  position: number;
  alt_text: string | null;
};

// public.post_media table row (Pass 7). Not read directly by the client —
// every read goes through the post-row RPCs above; this type exists for
// completeness / any server-side code that needs the full row shape.
export type PostMedia = {
  id: number;
  post_id: number;
  user_id: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  position: number;
  alt_text: string | null;
  created_at: string;
};

// Row shape shared by list_feed / get_post / list_user_posts. Author fields are
// joined; engagement counts and viewer flags are computed server-side so a
// caller never issues a per-post follow-up query. author_avatar_path / media
// added in Pass 7.
export type FeedPostRow = {
  id: number;
  user_id: string;
  post_type: PostType;
  body: string;
  visibility: PostVisibility;
  created_at: string;
  edited_at: string | null;
  author_username: string;
  author_display_name: string;
  like_count: number;
  comment_count: number;
  viewer_liked: boolean;
  viewer_bookmarked: boolean;
  is_author: boolean;
  author_avatar_path: string | null;
  media: PostMediaItem[];
};

// list_bookmarks adds the bookmark timestamp used for keyset pagination.
export type BookmarkPostRow = FeedPostRow & { bookmarked_at: string };

// Row shape returned by list_post_comments. `body` is null when the comment is
// deleted (a tombstone kept only to preserve a live reply's context).
// author_avatar_path added in Pass 7 (comments carry no images of their own).
export type PostCommentRow = {
  id: number;
  parent_comment_id: number | null;
  user_id: string;
  author_username: string;
  author_display_name: string;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
  is_author: boolean;
  author_avatar_path: string | null;
};

export type PostEngagementRow = {
  post_id: number;
  like_count: number;
  comment_count: number;
  viewer_liked: boolean;
  viewer_bookmarked: boolean;
};

// ---------------------------------------------------------------------------
// Notifications / Discover / Search — Social Network Pass 3
// ---------------------------------------------------------------------------

export type NotificationType =
  | "new_follower"
  | "post_like"
  | "post_comment"
  | "comment_reply"
  | "new_message";

export type NotificationEntityType =
  | "profile"
  | "post"
  | "comment"
  | "conversation";

export type Notification = {
  id: number;
  user_id: string;
  actor_user_id: string | null;
  notification_type: NotificationType;
  entity_type: NotificationEntityType | null;
  entity_id: number | null;
  read_at: string | null;
  created_at: string;
};

// Row shape returned by public.list_notifications(). actor_username /
// actor_display_name are null when the actor's account no longer exists.
// target_post_id / target_available are resolved server-side (block-aware,
// deleted-content-aware) — see docs/NOTIFICATIONS_DISCOVER_SEARCH.md.
export type NotificationRow = {
  id: number;
  notification_type: NotificationType;
  entity_type: NotificationEntityType | null;
  entity_id: number | null;
  actor_user_id: string | null;
  actor_username: string | null;
  actor_display_name: string | null;
  target_post_id: number | null;
  target_available: boolean;
  read_at: string | null;
  created_at: string;
  actor_avatar_path: string | null;
};

// Row shape shared by discover_people() / search_people(). viewer_follows is
// always false from discover_people() (it already excludes anyone the viewer
// follows) but real per-row state from search_people(), which does not.
// avatar_path added in Pass 7.
export type DiscoverPersonRow = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  viewer_follows: boolean;
  total_count: number;
  avatar_path: string | null;
};

export type DiscoverPeopleRow = DiscoverPersonRow & {
  shared_interest_count: number;
};

// ---------------------------------------------------------------------------
// Direct messages — Social Network Pass 4
// ---------------------------------------------------------------------------

export type Conversation = {
  id: number;
  user_min_id: string;
  user_max_id: string;
  last_message_at: string | null;
  created_at: string;
};

export type ConversationMember = {
  conversation_id: number;
  user_id: string;
  last_read_at: string | null;
  created_at: string;
};

export type Message = {
  id: number;
  conversation_id: number;
  sender_id: string;
  body: string;
  created_at: string;
};

// Row shape returned by public.list_conversations(). last_message_body /
// last_message_at are null for a conversation with no messages, but such a
// conversation never appears in this list (the RPC filters it out).
export type ConversationSummaryRow = {
  id: number;
  other_user_id: string;
  other_username: string;
  other_display_name: string;
  last_message_body: string | null;
  last_message_at: string | null;
  unread: boolean;
  other_avatar_path: string | null;
};

// Row shape returned by public.get_conversation(). No row at all when the
// caller is not a member, the id does not exist, or a block now stands
// between the two participants.
export type ConversationRow = {
  id: number;
  other_user_id: string;
  other_username: string;
  other_display_name: string;
  created_at: string;
  other_avatar_path: string | null;
};

// Row shape returned by public.list_messages(), newest first.
export type MessageRow = {
  id: number;
  sender_id: string;
  body: string;
  created_at: string;
  is_own: boolean;
};

// ---------------------------------------------------------------------------
// Communities — Social Network Pass 5
// ---------------------------------------------------------------------------

export type CommunityRole = "owner" | "moderator" | "member";

export type ReportTargetType =
  | "post"
  | "comment"
  | "profile"
  | "community"
  | "community_post";

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate_or_abuse"
  | "unsafe_content"
  | "misinformation"
  | "impersonation"
  | "other";

export type ReportStatus = "open" | "reviewed" | "actioned" | "dismissed";

export type Community = {
  id: number;
  owner_id: string;
  slug: string;
  name: string;
  description: string;
  rules: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  avatar_path: string | null;
  cover_path: string | null;
};

export type CommunityMember = {
  community_id: number;
  user_id: string;
  role: CommunityRole;
  joined_at: string;
};

export type CommunityPostLink = {
  community_id: number;
  post_id: number;
  author_id: string;
  created_at: string;
  removed_at: string | null;
  removed_by: string | null;
  removal_reason: string | null;
};

export type CommunityBan = {
  community_id: number;
  user_id: string;
  banned_by: string | null;
  reason: string | null;
  created_at: string;
};

export type Report = {
  id: number;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: number | null;
  target_user_id: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  created_at: string;
};

// Row shape returned by public.get_community(). viewer_role is null when the
// viewer is not a member.
export type CommunityRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  rules: string;
  owner_id: string;
  owner_username: string;
  owner_display_name: string;
  member_count: number;
  created_at: string;
  viewer_role: CommunityRole | null;
  avatar_path: string | null;
  cover_path: string | null;
};

// Row shape returned by public.list_my_communities() — the viewer's role is
// always non-null (every row is a community the viewer belongs to).
export type CommunityMyRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  member_count: number;
  viewer_role: CommunityRole;
  total_count: number;
  avatar_path: string | null;
};

// Row shape returned by public.list_discover_communities() — active
// communities the viewer has not joined.
export type CommunityDiscoverRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  member_count: number;
  total_count: number;
  avatar_path: string | null;
};

// Row shape returned by public.search_communities().
export type CommunitySearchRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  member_count: number;
  viewer_joined: boolean;
  total_count: number;
  avatar_path: string | null;
};

// Row shape returned by public.list_community_members().
export type CommunityMemberRow = {
  user_id: string;
  username: string;
  display_name: string;
  role: CommunityRole;
  joined_at: string;
  total_count: number;
  avatar_path: string | null;
};

// Row shape returned by public.list_community_bans() (owner/moderator only).
export type CommunityBanRow = {
  user_id: string;
  username: string;
  display_name: string;
  reason: string | null;
  created_at: string;
};

// Row shape returned by public.list_community_moderation_reports(). Never
// includes reporter_id — reporter identity is never exposed, even to
// community moderators.
export type CommunityModerationReportRow = {
  id: number;
  target_type: ReportTargetType;
  target_id: number;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  created_at: string;
};

// Row shape returned by public.get_post_community() — the (at most one) live
// community a post belongs to, or no row for a plain (non-community) post.
export type PostCommunityRow = {
  community_id: number;
  slug: string;
  name: string;
};

// Row shape returned by public.get_interest_names() — Pass 8 Step 3, replaces
// a two-step user_interests -> interests client read with one RPC call.
export type InterestNameRow = {
  name: string;
};

// ---------------------------------------------------------------------------
// Goals, Habits, Journal — Pass 6 (private personal-development layer)
// ---------------------------------------------------------------------------

export type GoalStatus = "active" | "paused" | "completed" | "archived";

export type Goal = {
  id: number;
  user_id: string;
  title: string;
  description: string;
  category: string | null;
  status: GoalStatus;
  target_date: string | null;
  progress_percent: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type GoalMilestone = {
  id: number;
  goal_id: number;
  user_id: string;
  title: string;
  position: number;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
};

export type HabitFrequency = "daily" | "weekly";

export type Habit = {
  id: number;
  user_id: string;
  name: string;
  description: string;
  frequency: HabitFrequency;
  target_per_period: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type HabitCheckin = {
  id: number;
  habit_id: number;
  user_id: string;
  checkin_date: string;
  value: number;
  note: string | null;
  created_at: string;
};

export type JournalMood =
  | "calm"
  | "focused"
  | "energised"
  | "neutral"
  | "stressed"
  | "low"
  | "grateful"
  | "reflective";

export type JournalEntry = {
  id: number;
  user_id: string;
  title: string | null;
  body: string;
  mood: JournalMood | null;
  entry_date: string;
  goal_id: number | null;
  habit_id: number | null;
  prime_assignment_id: number | null;
  created_at: string;
  updated_at: string;
};

// Row shape returned by public.toggle_goal_milestone().
export type ToggledGoalMilestone = {
  id: number;
  is_completed: boolean;
  completed_at: string | null;
};

// Row shape returned by public.check_in_habit().
export type HabitCheckinRow = {
  id: number;
  habit_id: number;
  checkin_date: string;
  value: number;
  note: string | null;
};

// ---------------------------------------------------------------------------
// Daily Direction — Pass 9 Step 1 (Action & Focus layer)
// ---------------------------------------------------------------------------

export type DailyDirectionStatus = "active" | "completed" | "skipped";

export type DailyDirection = {
  id: number;
  user_id: string;
  direction_date: string;
  intention: string | null;
  desired_identity: string | null;
  primary_action: string;
  why_it_matters: string | null;
  goal_id: number | null;
  habit_id: number | null;
  status: DailyDirectionStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<
        Profile,
        {
          id: string;
          username?: string | null;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          avatar_path?: string | null;
          cover_path?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<Profile, "id" | "created_at">> & { id?: string }
      >;
      interests: TableDefinition<
        Interest,
        {
          id?: number;
          slug: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        },
        Partial<Omit<Interest, "id" | "created_at">>
      >;
      user_interests: TableDefinition<
        UserInterest,
        { user_id: string; interest_id: number; created_at?: string },
        { user_id?: never; interest_id?: never; created_at?: never }
      >;
      prime_categories: TableDefinition<
        PrimeCategory,
        Omit<PrimeCategory, "id" | "created_at"> & { id?: number; created_at?: string },
        Partial<Omit<PrimeCategory, "id" | "created_at">>
      >;
      prime_protocols: TableDefinition<
        PrimeProtocol,
        Omit<PrimeProtocol, "id" | "created_at" | "updated_at"> & {
          id?: number;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<PrimeProtocol, "id" | "created_at">>
      >;
      prime_assignments: TableDefinition<
        PrimeAssignment,
        Omit<PrimeAssignment, "id" | "created_at"> & { id?: number; created_at?: string },
        Partial<Omit<PrimeAssignment, "id" | "created_at">>
      >;
      prime_completions: TableDefinition<
        PrimeCompletion,
        Omit<PrimeCompletion, "id" | "completed_at"> & { id?: number; completed_at?: string },
        Partial<Omit<PrimeCompletion, "id" | "completed_at">>
      >;
      connections: TableDefinition<
        Connection,
        // Mirrors the column-scoped INSERT grant in the migration. id,
        // created_at and updated_at are owned by defaults/trigger;
        // last_meaningful_contact_at is system-managed via the Phase B RPC.
        {
          user_id: string;
          name: string;
          connection_type: ConnectionType;
          connection_purpose: ConnectionPurpose;
          why_it_matters?: string | null;
          preferred_contact_days?: number | null;
          notes?: string | null;
          is_active?: boolean;
        },
        // Mirrors the column-scoped UPDATE grant in the migration. user_id, id,
        // the timestamps and last_meaningful_contact_at are not client-writable.
        Partial<
          Pick<
            Connection,
            | "name"
            | "connection_type"
            | "connection_purpose"
            | "why_it_matters"
            | "preferred_contact_days"
            | "notes"
            | "is_active"
          >
        >
      >;
      connection_interactions: TableDefinition<
        ConnectionInteraction,
        // No direct INSERT grant or policy in V1. Rows are created only by the
        // Phase B record_connection_interaction() SECURITY DEFINER RPC.
        Record<string, never>,
        // Append-only: no UPDATE or DELETE grant or policy exists.
        Record<string, never>
      >;
      follows: TableDefinition<
        Follow,
        // Read-only for clients. Rows are created only by the follow_user()
        // SECURITY DEFINER RPC and removed only by unfollow_user() / a block.
        Record<string, never>,
        Record<string, never>
      >;
      blocks: TableDefinition<
        Block,
        // Read-only for clients (and only your own rows). Rows are created only
        // by block_user() and removed only by unblock_user().
        Record<string, never>,
        Record<string, never>
      >;
      posts: TableDefinition<
        Post,
        // Read-only for clients. Rows are created only by create_post() and
        // changed only by update_post() / soft_delete_post().
        Record<string, never>,
        Record<string, never>
      >;
      post_comments: TableDefinition<
        PostComment,
        // Read-only for clients. Rows are created only by create_comment() and
        // changed only by edit_own_comment() / delete_own_comment().
        Record<string, never>,
        Record<string, never>
      >;
      post_likes: TableDefinition<
        PostLike,
        // Read-only for clients (own rows only). Written only by like_post() /
        // unlike_post().
        Record<string, never>,
        Record<string, never>
      >;
      post_bookmarks: TableDefinition<
        PostBookmark,
        // Read-only for clients (own rows only). Written only by bookmark_post()
        // / remove_bookmark().
        Record<string, never>,
        Record<string, never>
      >;
      post_media: TableDefinition<
        PostMedia,
        // Read-only for clients. Rows are created only by attach_post_media()
        // and removed only by remove_post_media() (Pass 7).
        Record<string, never>,
        Record<string, never>
      >;
      notifications: TableDefinition<
        Notification,
        // Read-only for clients. Rows are created only by the
        // notify_new_follower() / notify_post_like() / notify_post_comment() /
        // notify_new_message() triggers, and changed only by
        // mark_notification_read() / mark_all_notifications_read().
        Record<string, never>,
        Record<string, never>
      >;
      conversations: TableDefinition<
        Conversation,
        // Read-only for clients. Rows are created only by
        // get_or_create_conversation().
        Record<string, never>,
        Record<string, never>
      >;
      conversation_members: TableDefinition<
        ConversationMember,
        // Read-only for clients. Rows are created only by
        // get_or_create_conversation(); last_read_at is changed only by
        // send_message() (the sender) / mark_conversation_read().
        Record<string, never>,
        Record<string, never>
      >;
      messages: TableDefinition<
        Message,
        // Read-only for clients. Rows are created only by send_message().
        Record<string, never>,
        Record<string, never>
      >;
      communities: TableDefinition<
        Community,
        // Read-only for clients. Rows are created only by create_community().
        Record<string, never>,
        Record<string, never>
      >;
      community_members: TableDefinition<
        CommunityMember,
        // Read-only for clients. Rows are created only by create_community() /
        // join_community(); role is changed only by promote_community_moderator()
        // / demote_community_moderator().
        Record<string, never>,
        Record<string, never>
      >;
      community_post_links: TableDefinition<
        CommunityPostLink,
        // Read-only for clients. Rows are created only by
        // create_community_post(); changed only by remove_community_post().
        Record<string, never>,
        Record<string, never>
      >;
      community_bans: TableDefinition<
        CommunityBan,
        // No client select or write grant at all. Rows are created only by
        // ban_community_member() and removed only by unban_community_member().
        Record<string, never>,
        Record<string, never>
      >;
      reports: TableDefinition<
        Report,
        // No client select or write grant at all. Rows are created only by
        // create_report().
        Record<string, never>,
        Record<string, never>
      >;
      goals: TableDefinition<
        Goal,
        // Mirrors the column-scoped INSERT grant in the migration. id,
        // created_at, updated_at and completed_at are owned by
        // defaults/triggers; status/progress_percent always start at their
        // column defaults ('active' / 0) on create.
        {
          user_id: string;
          title: string;
          description?: string;
          category?: string | null;
          target_date?: string | null;
        },
        // Mirrors the column-scoped UPDATE grant. user_id, id, the
        // timestamps and completed_at are not client-writable; completed_at
        // and a forced progress_percent=100 are applied by the
        // apply_goal_completion_status() trigger on a status transition.
        Partial<
          Pick<
            Goal,
            | "title"
            | "description"
            | "category"
            | "target_date"
            | "status"
            | "progress_percent"
          >
        >
      >;
      goal_milestones: TableDefinition<
        GoalMilestone,
        // Read-only for clients. Rows are created only by
        // add_goal_milestone() and changed only by toggle_goal_milestone().
        Record<string, never>,
        Record<string, never>
      >;
      habits: TableDefinition<
        Habit,
        // Mirrors the column-scoped INSERT grant. id, created_at,
        // updated_at and archived_at are owned by defaults/triggers;
        // is_active always starts true on create.
        {
          user_id: string;
          name: string;
          description?: string;
          frequency: HabitFrequency;
          target_per_period?: number;
        },
        // Mirrors the column-scoped UPDATE grant. user_id, id, the
        // timestamps and archived_at are not client-writable; archived_at is
        // applied by the apply_habit_archived_at() trigger whenever
        // is_active changes.
        Partial<
          Pick<
            Habit,
            "name" | "description" | "frequency" | "target_per_period" | "is_active"
          >
        >
      >;
      habit_checkins: TableDefinition<
        HabitCheckin,
        // Read-only for clients. Rows are created/updated only by
        // check_in_habit() and removed only by undo_habit_checkin().
        Record<string, never>,
        Record<string, never>
      >;
      journal_entries: TableDefinition<
        JournalEntry,
        // Mirrors the column-scoped INSERT grant. id, created_at and
        // updated_at are owned by defaults/trigger. goal_id / habit_id /
        // prime_assignment_id are re-validated for same-owner integrity by
        // the enforce_journal_entry_ownership() trigger regardless of what
        // is sent here.
        {
          user_id: string;
          title?: string | null;
          body: string;
          mood?: JournalMood | null;
          entry_date?: string;
          goal_id?: number | null;
          habit_id?: number | null;
          prime_assignment_id?: number | null;
        },
        // Mirrors the column-scoped UPDATE grant. user_id, id and the
        // timestamps are not client-writable.
        Partial<
          Pick<
            JournalEntry,
            | "title"
            | "body"
            | "mood"
            | "entry_date"
            | "goal_id"
            | "habit_id"
            | "prime_assignment_id"
          >
        >
      >;
      daily_directions: TableDefinition<
        DailyDirection,
        // Mirrors the column-scoped INSERT grant. id, created_at and
        // updated_at are owned by defaults/trigger; direction_date is
        // never client-writable (always the column default, current_date);
        // status always starts 'active' on create; completed_at is
        // trigger-derived. goal_id / habit_id are re-validated for
        // same-owner integrity by enforce_daily_direction_ownership()
        // regardless of what is sent here.
        {
          user_id: string;
          intention?: string | null;
          desired_identity?: string | null;
          primary_action: string;
          why_it_matters?: string | null;
          goal_id?: number | null;
          habit_id?: number | null;
        },
        // Mirrors the column-scoped UPDATE grant. user_id, id,
        // direction_date and the timestamps are not client-writable;
        // completed_at is applied by apply_direction_completion_status()
        // whenever status transitions into/out of 'completed'.
        Partial<
          Pick<
            DailyDirection,
            | "intention"
            | "desired_identity"
            | "primary_action"
            | "why_it_matters"
            | "goal_id"
            | "habit_id"
            | "status"
          >
        >
      >;
    };
    Views: Record<string, never>;
    Functions: {
      complete_onboarding: {
        Args: {
          p_username: string;
          p_display_name: string;
          p_bio: string | null;
          p_interest_ids: number[];
        };
        Returns: undefined;
      };
      get_or_assign_daily_prime: {
        Args: Record<never, never>;
        Returns: DailyPrime[];
      };
      complete_daily_prime: {
        Args: { p_assignment_id: number };
        Returns: string;
      };
      save_prime_reflection: {
        Args: { p_assignment_id: number; p_reflection: string | null };
        Returns: string;
      };
      record_connection_interaction: {
        Args: {
          p_connection_id: number;
          p_interaction_type: ConnectionInteractionType;
          p_occurred_at?: string;
          p_notes?: string | null;
        };
        Returns: RecordedConnectionInteraction[];
      };
      get_connection_nudges: {
        Args: Record<never, never>;
        Returns: ConnectionNudge[];
      };
      follow_user: {
        Args: { p_target_id: string };
        Returns: undefined;
      };
      unfollow_user: {
        Args: { p_target_id: string };
        Returns: undefined;
      };
      block_user: {
        Args: { p_target_id: string };
        Returns: undefined;
      };
      unblock_user: {
        Args: { p_target_id: string };
        Returns: undefined;
      };
      get_social_profile: {
        Args: { p_username: string };
        Returns: SocialProfileRow[];
      };
      list_feed: {
        Args: {
          p_before_created_at?: string | null;
          p_before_id?: number | null;
          p_limit?: number;
        };
        Returns: FeedPostRow[];
      };
      get_post: {
        Args: { p_post_id: number };
        Returns: FeedPostRow[];
      };
      list_user_posts: {
        Args: {
          p_author_id: string;
          p_before_created_at?: string | null;
          p_before_id?: number | null;
          p_limit?: number;
        };
        Returns: FeedPostRow[];
      };
      list_bookmarks: {
        Args: {
          p_before_created_at?: string | null;
          p_before_post_id?: number | null;
          p_limit?: number;
        };
        Returns: BookmarkPostRow[];
      };
      get_post_engagement: {
        Args: { p_post_ids: number[] };
        Returns: PostEngagementRow[];
      };
      list_post_comments: {
        Args: { p_post_id: number };
        Returns: PostCommentRow[];
      };
      create_post: {
        Args: { p_post_type: string; p_body: string; p_visibility: string };
        Returns: number;
      };
      update_post: {
        Args: { p_post_id: number; p_body: string; p_visibility: string };
        Returns: undefined;
      };
      soft_delete_post: {
        Args: { p_post_id: number };
        Returns: undefined;
      };
      create_comment: {
        Args: {
          p_post_id: number;
          p_body: string;
          p_parent_comment_id?: number | null;
        };
        Returns: number;
      };
      edit_own_comment: {
        Args: { p_comment_id: number; p_body: string };
        Returns: undefined;
      };
      delete_own_comment: {
        Args: { p_comment_id: number };
        Returns: undefined;
      };
      like_post: {
        Args: { p_post_id: number };
        Returns: undefined;
      };
      unlike_post: {
        Args: { p_post_id: number };
        Returns: undefined;
      };
      bookmark_post: {
        Args: { p_post_id: number };
        Returns: undefined;
      };
      remove_bookmark: {
        Args: { p_post_id: number };
        Returns: undefined;
      };
      list_notifications: {
        Args: {
          p_before_created_at?: string | null;
          p_before_id?: number | null;
          p_limit?: number;
        };
        Returns: NotificationRow[];
      };
      get_unread_notification_count: {
        Args: Record<never, never>;
        Returns: number;
      };
      mark_notification_read: {
        Args: { p_notification_id: number };
        Returns: undefined;
      };
      mark_all_notifications_read: {
        Args: Record<never, never>;
        Returns: undefined;
      };
      discover_people: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: DiscoverPeopleRow[];
      };
      list_discover_posts: {
        Args: {
          p_before_created_at?: string | null;
          p_before_id?: number | null;
          p_limit?: number;
        };
        Returns: FeedPostRow[];
      };
      search_people: {
        Args: { p_query: string; p_limit?: number; p_offset?: number };
        Returns: DiscoverPersonRow[];
      };
      search_posts: {
        Args: {
          p_query: string;
          p_before_created_at?: string | null;
          p_before_id?: number | null;
          p_limit?: number;
        };
        Returns: FeedPostRow[];
      };
      get_or_create_conversation: {
        Args: { p_other_user_id: string };
        Returns: number;
      };
      send_message: {
        Args: { p_conversation_id: number; p_body: string };
        Returns: number;
      };
      mark_conversation_read: {
        Args: { p_conversation_id: number };
        Returns: undefined;
      };
      list_conversations: {
        Args: {
          p_before_last_message_at?: string | null;
          p_before_id?: number | null;
          p_limit?: number;
        };
        Returns: ConversationSummaryRow[];
      };
      get_conversation: {
        Args: { p_conversation_id: number };
        Returns: ConversationRow[];
      };
      list_messages: {
        Args: {
          p_conversation_id: number;
          p_before_created_at?: string | null;
          p_before_id?: number | null;
          p_limit?: number;
        };
        Returns: MessageRow[];
      };
      get_unread_message_count: {
        Args: Record<never, never>;
        Returns: number;
      };
      create_community: {
        Args: {
          p_name: string;
          p_slug: string;
          p_description?: string;
          p_rules?: string;
        };
        Returns: number;
      };
      join_community: {
        Args: { p_community_id: number };
        Returns: undefined;
      };
      leave_community: {
        Args: { p_community_id: number };
        Returns: undefined;
      };
      create_community_post: {
        Args: { p_community_id: number; p_post_type: string; p_body: string };
        Returns: number;
      };
      remove_community_post: {
        Args: {
          p_community_id: number;
          p_post_id: number;
          p_reason?: string | null;
        };
        Returns: undefined;
      };
      promote_community_moderator: {
        Args: { p_community_id: number; p_user_id: string };
        Returns: undefined;
      };
      demote_community_moderator: {
        Args: { p_community_id: number; p_user_id: string };
        Returns: undefined;
      };
      remove_community_member: {
        Args: { p_community_id: number; p_user_id: string };
        Returns: undefined;
      };
      ban_community_member: {
        Args: {
          p_community_id: number;
          p_user_id: string;
          p_reason?: string | null;
        };
        Returns: undefined;
      };
      unban_community_member: {
        Args: { p_community_id: number; p_user_id: string };
        Returns: undefined;
      };
      create_report: {
        Args: {
          p_target_type: ReportTargetType;
          p_target_id: number | null;
          p_target_user_id: string | null;
          p_reason: ReportReason;
          p_details?: string | null;
        };
        Returns: undefined;
      };
      get_community: {
        Args: { p_slug: string };
        Returns: CommunityRow[];
      };
      list_my_communities: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: CommunityMyRow[];
      };
      list_discover_communities: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: CommunityDiscoverRow[];
      };
      search_communities: {
        Args: { p_query: string; p_limit?: number; p_offset?: number };
        Returns: CommunitySearchRow[];
      };
      list_community_members: {
        Args: { p_community_id: number; p_limit?: number; p_offset?: number };
        Returns: CommunityMemberRow[];
      };
      list_community_posts: {
        Args: {
          p_community_id: number;
          p_before_created_at?: string | null;
          p_before_id?: number | null;
          p_limit?: number;
        };
        Returns: FeedPostRow[];
      };
      list_community_moderation_reports: {
        Args: { p_community_id: number };
        Returns: CommunityModerationReportRow[];
      };
      list_community_bans: {
        Args: { p_community_id: number };
        Returns: CommunityBanRow[];
      };
      get_post_community: {
        Args: { p_post_id: number };
        Returns: PostCommunityRow[];
      };
      get_interest_names: {
        Args: { p_user_id: string };
        Returns: InterestNameRow[];
      };
      add_goal_milestone: {
        Args: { p_goal_id: number; p_title: string };
        Returns: number;
      };
      toggle_goal_milestone: {
        Args: { p_milestone_id: number };
        Returns: ToggledGoalMilestone[];
      };
      check_in_habit: {
        Args: {
          p_habit_id: number;
          p_checkin_date?: string;
          p_value?: number;
          p_note?: string | null;
        };
        Returns: HabitCheckinRow[];
      };
      undo_habit_checkin: {
        Args: { p_habit_id: number; p_checkin_date?: string };
        Returns: undefined;
      };
      attach_post_media: {
        Args: {
          p_post_id: number;
          p_storage_path: string;
          p_mime_type: string;
          p_size_bytes: number;
          p_width?: number | null;
          p_height?: number | null;
          p_alt_text?: string | null;
        };
        Returns: number;
      };
      remove_post_media: {
        Args: { p_media_id: number };
        Returns: string;
      };
      set_community_avatar: {
        Args: { p_community_id: number; p_storage_path?: string | null };
        Returns: undefined;
      };
      set_community_cover: {
        Args: { p_community_id: number; p_storage_path?: string | null };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export interface OnboardingFormData {
  username: string;
  displayName: string;
  bio: string;
  interestIds: number[];
}

export interface ProfileUpdateData {
  username: string;
  displayName: string;
  bio: string;
}
