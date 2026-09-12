# Diong Direct Messages — Social Network Pass 4

Pass 4 adds secure private 1-to-1 messaging on top of the Pass 1 follow / block
graph, the Pass 2 posts/comments and the Pass 3 notifications / Discover /
Search: **conversations, an inbox, a conversation view, sending a message,
unread state and mark-as-read**, plus a **Message** button on public profiles
and a Messages nav badge.

Pass 4 does **not** add message editing, unsend, attachments, reactions, group
chat or calls, communities, Goals, Habits, Journal or an AI Coach. It does not
change Daily Prime, Connections, feed visibility, or the Pass 1 follow / block
semantics, and it does not modify any already-applied migration file.

## What a user can do after Pass 4

- Click **Message** on someone's public profile (unless a block stands
  between the two accounts) and land in a 1-to-1 conversation, created on
  first click.
- Open `/messages` for an inbox of every conversation that has at least one
  message, most recently active first, with an unread indicator.
- Open `/messages/<conversationId>` to read the full history and send a
  message (1–5000 characters, text only).
- See a **Messages** badge in the app header with their total unread message
  count, and a **new_message** entry in `/notifications` for an unread
  conversation.

All of this is private to signed-in Diong members. Blocking is authoritative:
it prevents creating a new conversation, prevents sending into an existing
one, and hides an existing conversation from both accounts' inboxes the
moment either one blocks the other.

## Migration to run

Apply in order against the target Supabase project, after every earlier
migration:

1. `supabase/migrations/202609120002_direct_messages.sql`

It depends on `public.profiles` / `auth.users` (202607190001),
`public.follows` / `public.blocks` / `public.blocked_between`
(202609100002 / 202609100003) and `public.notifications`
(202609100004). It is a single `begin … commit` transaction and is **not**
idempotent — `create table` / `create function` (not `create or replace`)
fail cleanly if the objects already exist. Never re-run a migration that
already succeeded.

With the Supabase CLI linked:

```bash
supabase db push
```

Or paste the whole file once into the SQL Editor, confirm the project, run it,
and record the filename + date in the deployment log.

No new environment variables. No service-role key is used.

### Exact SQL applied

The migration is additive in two senses:

1. It **creates** three new tables (`public.conversations`,
   `public.conversation_members`, `public.messages`), their RLS, two
   triggers, nine new functions (`is_conversation_member`,
   `get_or_create_conversation`, `send_message`, `mark_conversation_read`,
   `list_conversations`, `get_conversation`, `list_messages`,
   `get_unread_message_count`, `notify_new_message`,
   `enforce_conversation_member_limit`).
2. It **extends** the existing (Pass 3) `public.notifications` table via
   `ALTER TABLE … DROP/ADD CONSTRAINT` (adding the `new_message` /
   `conversation` values to its three CHECK constraints) and re-creates
   `public.list_notifications()` via `CREATE OR REPLACE FUNCTION` (same
   signature, only adding a `new_message` branch to its `target_available`
   resolution) — the same additive-evolution pattern already established by
   `202609120001_fix_social_profile_username.sql` against Pass 1. The
   `202609100004_notifications_discover_search.sql` file itself is untouched.

The full statement text is the migration file itself:
`supabase/migrations/202609120002_direct_messages.sql`.

## Schema

### `public.conversations`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | Primary key. |
| `user_min_id` / `user_max_id` | `uuid` | The two participants, always stored in canonical (smaller, larger) order. `references auth.users(id) on delete cascade`. |
| `last_message_at` | `timestamptz` | Null until the first message; stamped by `send_message()`. A conversation with no messages does not appear in `list_conversations()`. |
| `created_at` | `timestamptz` | Default `now()`. |

Constraints: `conversations_ordered_pair` (`user_min_id < user_max_id`, which
also implies the two ids are distinct); `conversations_unique_pair`
`unique (user_min_id, user_max_id)` — **this is the entire mechanism** that
guarantees exactly one direct conversation per user pair (see below).

Index: `conversations_last_message_activity_idx`
`(last_message_at desc, id desc) where last_message_at is not null`.

### `public.conversation_members`

| Column | Type | Notes |
| --- | --- | --- |
| `conversation_id` | `bigint` | `references public.conversations(id) on delete cascade`. |
| `user_id` | `uuid` | `references auth.users(id) on delete cascade`. |
| `last_read_at` | `timestamptz` | Null until first read. Updated by `send_message()` (for the sender — a sender never sees their own message as unread) and `mark_conversation_read()` (for the reader). |
| `created_at` | `timestamptz` | Default `now()`. |

Primary key `(conversation_id, user_id)`. The
`conversation_members_enforce_limit` **BEFORE INSERT** trigger
(`enforce_conversation_member_limit()`) rejects a third member — Pass 4 ships
direct messages only, never group chat — as defence in depth alongside the
RPC being the only write path.

Index: `conversation_members_user_id_idx` `(user_id)` — "which conversations
is this user in", the reverse of the primary key.

### `public.messages`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | Primary key. |
| `conversation_id` | `bigint` | `references public.conversations(id) on delete cascade`. |
| `sender_id` | `uuid` | `references auth.users(id) on delete cascade`. Always `auth.uid()` — never a client-supplied column. |
| `body` | `text` | Plain text, trimmed, 1–5000 chars. Rendered as text — never HTML. |
| `created_at` | `timestamptz` | Default `now()`. Messages are never edited or unsent in Pass 4, so there is no `updated_at` / `edited_at` / `deleted_at`. |

Constraint: `messages_body_not_empty`
(`char_length(btrim(body)) between 1 and 5000`).

Index: `messages_conversation_created_idx`
`(conversation_id, created_at desc, id desc)`.

## Conversation uniqueness design

Exactly one direct conversation per user pair is enforced entirely by the
database, not by application logic: the two participant ids are always
inserted in canonical order (`user_min_id = least(a, b)`,
`user_max_id = greatest(a, b)`), and `conversations_unique_pair` is a
`unique (user_min_id, user_max_id)` constraint. There is no way for two rows
to represent the same pair regardless of call order (A messages B first, or B
messages A first — both normalise to the same canonical pair), and no
select-then-insert race can create a duplicate: `get_or_create_conversation()`
does `insert … on conflict (user_min_id, user_max_id) do nothing` and then
selects the (now guaranteed unique) row by that same key. This mirrors the
`follows_unique_pair` / `blocks_unique_pair` pattern from Pass 1, just with a
canonical-order twist because a conversation, unlike a follow, is symmetric.

## RPCs

All: `language plpgsql` / `sql`, `security definer`, `set search_path = ''`,
every object schema-qualified, viewer from `auth.uid()`, `revoke all … from
public, anon` then `grant execute … to authenticated`. Reads are `stable`.

| Function | Purpose |
| --- | --- |
| `is_conversation_member(p_conversation_id, p_user_id)` | Internal helper. `security definer` so it can be used inside RLS policies without recursion — it reads `conversation_members` as the function owner, exactly the way `blocked_between()` reads `blocks`. |
| `get_or_create_conversation(p_other_user_id)` | Returns the caller's conversation with the target, creating it if needed. Rejects a null/self/incomplete/blocked target with the same guard shape as `follow_user()`. |
| `send_message(p_conversation_id, p_body)` | The only way a row is ever inserted into `messages`. `sender_id` is always `auth.uid()`. Requires live membership + no block; stamps `conversations.last_message_at` and the sender's own `last_read_at`. |
| `mark_conversation_read(p_conversation_id)` | Updates the caller's `last_read_at` for that conversation. A no-op (not an error) if the caller is not a member. |
| `list_conversations(p_before_last_message_at, p_before_id, p_limit)` | The inbox: conversations with ≥1 message, most recently active first, block filtered, keyset paginated. |
| `get_conversation(p_conversation_id)` | One conversation from the viewer's point of view; **no row** when the caller is not a member, the id does not exist, or a block now stands between the two participants. |
| `list_messages(p_conversation_id, p_before_created_at, p_before_id, p_limit)` | Messages in one conversation, newest first, keyset paginated (same cursor shape as `list_feed`); returns nothing rather than raising for a non-member / now-blocked caller. |
| `get_unread_message_count()` | Total unread messages across every non-blocked conversation the viewer is in. Powers the Messages nav badge. |
| `notify_new_message()` | **Trigger function only** (`after insert on messages`), never called directly. |
| `enforce_conversation_member_limit()` | **Trigger function only** (`before insert on conversation_members`), never called directly. |

## Inbox behaviour

`list_conversations()` returns one row per conversation with the other
participant's profile, a plain-text preview of the last message
(`messageSnippet()`, collapsed to one line, 80 chars, ellipsis), the last
activity timestamp and a server-computed `unread` boolean (a message from the
other participant newer than the caller's `last_read_at`). A conversation
with **zero** messages — e.g. right after clicking **Message** but before
typing anything — does not appear in the inbox; opening it at
`/messages/<id>` still works. A conversation is dropped from the inbox
entirely, for both accounts, the moment a block stands between them
(`not blocked_between(...)` in the RPC's `where`), the same policy Pass 3
applies to notifications.

## Send / read behaviour

`send_message()` is the sole write path into `public.messages`. It re-derives
the sender from `auth.uid()` (never a client-supplied column), requires the
caller to still be a member, and requires no block between the two
participants — checked at send time, not just at conversation-creation time,
so a conversation created before a later block cannot still be used to send
into. A successful send stamps the conversation's `last_message_at` (moves it
to the top of both inboxes) and the sender's own `last_read_at` (so a sender
never sees their own message flagged unread). Opening `/messages/<id>` calls
`mark_conversation_read()` for the viewer.

## Profile Message integration

`ProfileSocialPanel` (`src/components/social/profile-social-panel.tsx`) gains
a **Message** button next to Follow / Block, in the same non-self,
non-blocked branch — it is never rendered when the owner has blocked the
viewer (that branch of the panel does not render Follow/Block/Message at all)
or when the viewer has blocked the owner (the panel's dedicated "You blocked
this account" branch also has no Message button). The button posts to
`messageProfile()` (`app/(protected)/profile/[username]/actions.ts`, added
alongside — not modifying — the existing `followProfile` / `blockProfile`
actions), which calls `get_or_create_conversation()` and redirects straight
to `/messages/<id>` on success, or shows a safe inline error otherwise. The
target user id is bound as a server argument by the profile page, exactly
like the existing Follow / Block buttons — never a form field.

## Notification integration

A `new_message` notification reuses the existing Pass 3 `public.notifications`
table and read path (`list_notifications()`, `get_unread_notification_count()`,
`mark_notification_read()`, `/notifications`) rather than a parallel system.
The `messages_notify_new_message` trigger (`after insert on messages`) creates
it. **Dedup policy** (documented in the migration): unlike a like/follow
(idempotent toggle, notified once ever) or a comment (never deduplicated,
each a distinct event), a message thread can produce many events in quick
succession — so the recipient gets at most **one unread** `new_message`
notification per conversation at a time; a further message in the same
conversation while that notification is still unread does not create a
second one, and reading it (`mark_notification_read` /
`mark_all_notifications_read`) lets the next message create a fresh one.

`describeNotification()` renders it as "`<name>` sent you a message." and
`notificationHref()` links it to `/messages/<conversationId>` (using the
notification's existing generic `entity_id` column — no new column was
needed). The notification-open route's redirect allow-list
(`app/(protected)/notifications/open/[id]/route.ts`) was extended from
`posts/\d+ | profile/[a-z0-9_]{3,30}` to also accept `messages/\d+`.

## Blocking behaviour

If **A blocks B** (or B blocks A):

- Neither can create a new conversation with the other (`get_or_create_conversation`
  raises `42501`).
- Neither can send into an existing conversation with the other
  (`send_message` raises `42501`), even one created before the block.
- The conversation disappears from **both** inboxes (`list_conversations`
  filters it out) and its page 404s for both (`get_conversation` / `get_post`-
  style "no row" → `notFound()`).
- Existing messages are **not** deleted — they simply stop being reachable
  while the block stands, and reappear (for both, in the same conversation)
  if unblocked. This mirrors Pass 2's "likes/bookmarks survive a block, just
  become unreachable" policy exactly.
- Pass 1 profile-level and Pass 2 post-level block behaviour is unchanged.

## RLS / security

RLS is enabled on all three tables with a revoke-first model. `anon` has no
access. `authenticated` has **`SELECT` only** — every write goes through a
`SECURITY DEFINER` RPC (the Pass 1/2/3 model).

| Table | `select` policy |
| --- | --- |
| `conversations` | `is_conversation_member(id, auth.uid())` |
| `conversation_members` | `is_conversation_member(conversation_id, auth.uid())` |
| `messages` | `is_conversation_member(conversation_id, auth.uid())` |

`is_conversation_member()` is `security definer` specifically so it can be
used inside these policies without triggering "infinite recursion detected in
policy": it reads `conversation_members` as the function owner, which bypasses
that table's own RLS, exactly the way `blocked_between()` (Pass 2) reads
`blocks` as the function owner from inside the `posts` RLS policy.

Every RPC re-derives the acting user from `auth.uid()` — the browser cannot
supply a sender, member or recipient id for any write. Every
`SECURITY DEFINER` function is `set search_path = ''` and every table/function
reference inside them is schema-qualified (`public.…` / `auth.users`). Every
error raised uses a fixed, non-leaking message
(`'Authentication is required.'`, `'This conversation is not available.'`,
`'This account is not available.'`, `'You cannot message this account.'`,
`'Write between 1 and 5000 characters.'`, `'A direct conversation supports
exactly two members.'`) — no raw Postgres/constraint text ever reaches the
client; the TypeScript mutation wrappers (`message-mutations.ts`) additionally
collapse every SQLSTATE to `not_available` / `invalid` / `unknown` before it
reaches a server action.

## Pagination

Keyset ("cursor") pagination on `(created_at_or_last_message_at, id)`, the
same stable-under-insertion shape Pass 2/3 use for the feed and notifications
— never a large `OFFSET`. `src/lib/messages/message-pagination.ts` is a fresh,
private copy of the cursor encode/parse/clamp logic (deliberately not reusing
`src/lib/social/pagination.ts`), following that file's own stated precedent of
each pass owning its cursor logic so an earlier pass's semantics can never be
disturbed by a later one.

- **Inbox** (`list_conversations`): newest-activity-first, cursor on
  `(last_message_at, id)`. First page server-rendered; **Load more** appends
  via `loadMoreConversations`.
- **Messages** (`list_messages`): the RPC returns newest-first (like
  `list_feed`); `listMessages()` in `message-data.ts` reverses it for direct
  oldest-first rendering and derives the "load older" cursor from the oldest
  row in the page. **Load earlier messages** prepends the previous page via
  `loadMoreMessages`.

Page size is **20**, clamped server-side in both the RPC and `clampLimit()`.

## Tests

`src/lib/messages/message-pagination.test.ts` — cursor round-trip, malformed/
out-of-range rejection, array-value handling, `clampLimit` clamping (mirrors
`src/lib/social/pagination.test.ts`).

`src/lib/messages/message-validation.test.ts` — `normalizeMessageBody`
(trim, CRLF normalisation, control-char stripping, blank-line collapsing),
`validateMessageBody` (empty / max-length / at-max-length), `hasErrors`.

`src/lib/messages/message-labels.test.ts` — `messageSnippet` (null, collapsed
whitespace, short pass-through, truncation with ellipsis).

`src/lib/social/notification-labels.test.ts` — extended (not replaced) with
cases for the new `new_message` branch of `describeNotification` /
`notificationHref`, and its "never returns anything but …" shape test now
also allows `/messages/\d+`.

## `npm test` result

All 22 test files / 219 tests pass (up from 21 files / 213 tests before this
pass), including the three new Pass 4 test files and the extended Pass 3
notification-labels tests.

## `npm run lint` result

Clean — zero errors, zero warnings.

## `npm run build` result

Succeeds. `/messages` and `/messages/[conversationId]` are dynamic (`ƒ`)
routes, consistent with every other protected, per-user route. The build uses
Turbopack (`next build`'s default for this project — `next.config.ts` sets no
Webpack override, and none was introduced by this pass).

## Two-user browser test steps

Two completed-onboarding accounts, **A** and **B**, no existing block between
them.

1. A: open `/profile/<B>` → click **Message**. Redirects to
   `/messages/<new id>`, empty thread, "Say hello to B."
2. A: type a message, **Send**. Bubble appears immediately, right-aligned,
   composer clears, input stays enabled for the next message (no duplicate
   send from the same click).
3. B: open `/messages`. The conversation appears with A's preview, marked
   **New**; the Messages nav badge shows an unread count of 1; `/notifications`
   shows "A sent you a message."
4. B: open the conversation. Message appears left-aligned; the row's unread
   state clears on reload of `/messages`; the nav badge count decreases.
5. B: reply. A's `/messages` and nav badge update on A's next request.
6. A: send several more messages in a row while B has not opened
   `/notifications`. B still sees only **one** unread `new_message`
   notification for this conversation (dedup policy) until B reads it.
7. A: `/profile/<B>` → **Block** → confirm.
8. A: `/messages` — the conversation with B is gone from the inbox.
9. A: `/messages/<that id>` directly — branded 404.
10. B: `/messages` — the conversation is also gone from B's inbox; B's attempt
    to send (if B had it open) fails safely.
11. A: **Unblock** B. The conversation reappears in both inboxes with full
    history intact.
12. Either account: attempt to open a random/non-existent
    `/messages/999999999` — branded 404, not an error page.
13. `/feed`, `/discover`, `/search`, `/profile/<username>` — confirm no
    message content, previews or conversation state appear anywhere on these
    pages.
14. 375px viewport on `/messages` and `/messages/<id>` — single column,
    controls wrap, no horizontal scroll, composer usable.

## Rollback

Pass 4 is a single migration, additive to an already-shipped table
(`notifications`). To roll back the new tables (destructive — deletes every
conversation and message; back up first) while leaving Pass 3's
`notifications` schema at its Pass 4 shape (harmless — the extra allowed enum
values and the `new_message` trigger simply go unused once `messages` is
gone) is safest:

```sql
begin;
drop trigger if exists messages_notify_new_message on public.messages;
drop function if exists public.notify_new_message();
drop function if exists public.get_unread_message_count();
drop function if exists public.list_messages(bigint, timestamptz, bigint, integer);
drop function if exists public.get_conversation(bigint);
drop function if exists public.list_conversations(timestamptz, bigint, integer);
drop function if exists public.mark_conversation_read(bigint);
drop function if exists public.send_message(bigint, text);
drop function if exists public.get_or_create_conversation(uuid);
drop trigger if exists conversation_members_enforce_limit on public.conversation_members;
drop function if exists public.enforce_conversation_member_limit();
drop function if exists public.is_conversation_member(bigint, uuid);
drop table if exists public.messages;
drop table if exists public.conversation_members;
drop table if exists public.conversations;
commit;
```

Reverting `list_notifications()` to its pre-Pass-4 body and the three
`notifications` CHECK constraints to their pre-Pass-4 form is optional (they
are harmless supersets) — do it only if a full revert to the exact Pass 3
schema is required, by re-running the relevant sections of
`202609100004_notifications_discover_search.sql` as `CREATE OR REPLACE` /
`ALTER TABLE` statements.

Revert the app code (`src/lib/messages/`, `src/components/messages/`,
`app/(protected)/messages/`, the profile Message button, the header badge,
the notification-labels / notification-open-route additions) first, before
dropping the schema, so no running request can reference an object mid-drop.
