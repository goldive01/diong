# Diong UX Reliability & Accessibility — Pass 8, Step 2

This document covers Pass 8 Step 2: loading states, error boundaries,
404 handling, form/action pending states, accessibility, mobile UX, empty
states, and safe error handling. It does not cover database performance,
new product features, analytics, push notifications, offline sync, or
deployment — those stay out of scope for this step.

No database migration was needed. Nothing here touches RLS, RPCs, or any
existing table.

Before changing anything, the existing state of each area was audited
(mostly via read-only exploration, not guesswork), because a fair amount of
this architecture already existed from earlier passes and was already
solid — the goal was to close real gaps, not redesign working parts.

## 1. Loading strategy

`app/(protected)/loading.tsx` (pre-existing) is the shared fallback for the
whole authenticated area — a generic label/heading/two-card skeleton, used
by every protected route that doesn't have a more specific one.

New in this step: `src/components/app/loading-skeleton.tsx` provides three
shape primitives (`SkeletonLine`, `SkeletonBlock`, `SkeletonCard`) and a
`LoadingStatus` wrapper (`role="status"`, `aria-label`, `aria-hidden` on the
skeleton shapes themselves, an `sr-only` text fallback) so every
route-specific `loading.tsx` shares one accessible pattern instead of
duplicating markup.

Five routes got a dedicated `loading.tsx`, chosen because their `page.tsx`
does 2+ parallel data fetches before rendering anything (a real
blank-screen-time win over the generic skeleton), each shaped to
approximate that page's actual sections so there's no layout shift when the
real content lands:

- `app/(protected)/home/loading.tsx`
- `app/(protected)/discover/loading.tsx`
- `app/(protected)/communities/loading.tsx`
- `app/(protected)/notifications/loading.tsx`
- `app/(protected)/search/loading.tsx`

Every other protected route (single sequential fetch, or a form-only create
page) keeps using the shared `(protected)/loading.tsx` — adding a
dedicated skeleton there would be markup duplication for no real benefit,
which is why the brief explicitly warned against doing this for every
route.

**Known limitation**: Next.js's `loading.tsx` Suspense boundary covers the
whole segment subtree unless a nested segment defines its own. Because
`communities/loading.tsx` has no more specific sibling under
`communities/[slug]` or `communities/new`, a fast navigation into a specific
community can very briefly show the "your communities" list skeleton shape
before the community page itself renders, rather than a shape matching the
community page. This is a minor shape mismatch, not a correctness bug, and
was accepted rather than adding a `loading.tsx` to every nested dynamic
route (which the brief also warned against).

## 2. Error-boundary architecture

Three boundaries, each with a distinct scope:

- **`app/(protected)/error.tsx`** (pre-existing) — catches errors inside
  the authenticated area. Renders inside `(protected)/layout.tsx`, so the
  `AppHeader` stays visible. "Try again" calls `reset()`; "Go to home"
  links out.
- **`app/error.tsx`** (new) — catches errors on every route outside
  `app/(protected)`: the landing page, `/login`, `/register`,
  `/forgot-password`, `/reset-password`, `/onboarding`, `/privacy`,
  `/terms`. Before this file existed, an error anywhere in that group fell
  through to `global-error.tsx`, which replaces the *entire* HTML document
  (loses the root layout, fonts, skip link) — a much bigger hammer than a
  single broken auth/marketing page needs. Same safe copy and `reset()`
  pattern as the protected boundary, rendered inside the root layout.
- **`app/global-error.tsx`** (pre-existing) — the last resort, for an
  error that escapes the root layout itself. Renders its own
  `<html>/<body>` with inline styles (no external stylesheet is guaranteed
  to be available at that point).

All three: a calm, generic message, a `reset()` "Try again" button, a link
back to a safe page, `role="alert"` (or an `<html>`-replacing equivalent),
and — critically — **no Supabase/Postgres error text, stack trace, or
`error.digest` shown to the user**; the raw `error` is only ever passed to
`console.error` for server/browser diagnostics.

## 3. Not-found handling

`app/not-found.tsx` (pre-existing) is the root 404 — used for a truly
unmatched URL, or a `notFound()` call from a route with no closer
`not-found.tsx` boundary of its own.

**New in this step: `app/(protected)/not-found.tsx`.** This was a real gap,
not a style preference: Next.js renders the *nearest* `not-found.tsx` to
where `notFound()` was thrown, but only wraps it in the layouts **on the
path to that boundary file** — not the layouts on the path to the page that
threw. Every dynamic protected route (`goals/[id]`, `habits/[id]`,
`journal/[id]`, `communities/[slug]`, `profile/[username]`,
`connections/[id]`, `messages/[conversationId]`, `posts/[id]`,
`daily-prime/history/[assignmentId]`) calls `notFound()` when its resource
is missing or the viewer isn't authorized to see it — and without a
`(protected)/not-found.tsx`, all of those fell through to the *root*
`not-found.tsx`, which renders only inside the root layout: a signed-in
user hitting a 404 mid-session would suddenly lose the `AppHeader` (nav,
search, unread badges, log out) entirely. `(protected)/not-found.tsx` fixes
this by living inside the segment that already has `AppHeader` — and
because `(protected)/layout.tsx` already ran `requireCompletedProfile()` by
the time this renders, the viewer is known to be authenticated, so it can
safely offer a direct "Go to your feed" link (the brief asked for this
"only if practical without awkward auth coupling" — this placement makes it
free).

**Existence vs. authorization.** Every dynamic-route page audited already
collapses "resource doesn't exist" and "resource exists but you can't see
it" into the exact same `notFound()` call — confirmed for profile, posts,
communities, communities-moderation, goals, habits, journal, connections,
and messages. None of them leak existence through a distinct "access
denied" message. This was already correct before this step; nothing needed
to change here.

## 4. Form/action pending states

Audited every major mutation surface: post composer (feed + community),
post edit, comments (create/reply/edit), follow/unfollow, block/unblock,
message send, goals, habits, journal, Daily Prime reflection/completion,
connections. **All of them already use `useActionState`'s built-in pending
flag** (or `useTransition` for the few that use direct async calls instead
of a form action), disable their submit control while pending, show a
visible pending indicator (a text swap like "Saving…"/"Sending…"), and
preserve the user's entered text on a validation error (via controlled
local state that's only cleared on confirmed success, or via a
server-echoed value). No gaps were found — this step did not need to touch
this area.

## 5. Accessibility fixes

- **Current-page indication in navigation.** `AppHeader`
  (`src/components/app/app-header.tsx`) had no way to tell a keyboard or
  screen-reader user which section they were in. It's now a client
  component using `usePathname()`; each nav link gets
  `aria-current={isNavLinkActive(pathname, href) ? "page" : undefined}`
  plus a matching subtle style (`aria-[current=page]:bg-white`). The
  path-matching predicate is `src/lib/app/nav-active.ts` — pulled out as a
  pure function specifically so the "nested path still counts, unrelated
  prefix doesn't" logic is unit-tested
  (`src/lib/app/nav-active.test.ts`), not just eyeballed.
- **Focus loss on delete/block/moderate confirmation.** Post delete
  (`post-owner-actions.tsx`), journal entry delete
  (`journal-delete-button.tsx`), block user (`block-button.tsx`), and every
  community moderation action (`moderation-action-button.tsx`, used for
  promote/demote/remove-member/ban/unban/remove-post) all swap their
  trigger button for a Confirm/Cancel step on click. The newly-mounted
  buttons never received focus, so a keyboard or screen-reader user's focus
  silently dropped to `<body>` on every one of these. Fixed with one shared
  hook, `src/lib/a11y/use-confirm-focus.ts` — it moves focus onto the
  step's Cancel/Keep button (the safe, reversible default) as soon as the
  confirm step mounts. Applied identically across all four components
  rather than four bespoke fixes.
- **Comment delete had no confirmation step at all** (unlike every other
  destructive action in the app — post, journal entry, block, moderation).
  `comment-card.tsx` now uses the same confirm-then-focus pattern as the
  rest.
- **Report form errors weren't wired to their fields.**
  `report-button.tsx`'s reason/details validation errors were plain
  `<p>` tags with no `role="alert"` and no `aria-describedby` link back to
  the `<select>`/`<textarea>`. Fixed — both fields now describe their error
  via `aria-describedby`, and the error text carries `role="alert"`.
- **Undersized touch targets** bumped to a 44px (`min-h-11`) minimum:
  the `ReportButton` trigger, comment Reply/Edit/Delete, and
  "Mark as read" on a notification row. The staged-image "remove" button
  (an icon overlaid on a small thumbnail in `post-image-picker.tsx` /
  `post-media-editor.tsx`) went from 24px to 32px (`size-8`) — a deliberate
  middle ground, since a full 44px circle would visually dominate a small
  thumbnail; 24px alone meets only the bare WCAG 2.2 AA minimum, not a
  comfortable mobile target.

**Audited and found already correct, not touched**: icon-only button
labeling app-wide, label/input association on every form checked, heading
hierarchy on feed/profile/community pages, the post-image lightbox
(`role="dialog"`, `aria-modal`, Escape-to-close, focus-to-close-button —
already exemplary), and the deliberate choice to describe most field errors
via `aria-describedby` instead of `role="alert"` (adding `role="alert"`
everywhere would double-announce errors that are already read as part of
the focused field's description).

## 6. Mobile UX fixes (375px / 768px / desktop)

Verified via static analysis of Tailwind classes (no fixed-pixel widths,
`flex-wrap` used consistently, `truncate`/`min-w-0` already present on list
rows like `conversation-row.tsx` and `community-members-list.tsx`) rather
than a live browser, since this environment has no headless browser
available.

Two real gaps found and fixed: `app/(protected)/profile/[username]/page.tsx`'s
`<h1>` display name / `@username` line, and
`app/(protected)/communities/[slug]/page.tsx`'s `<h1>` community name, had
no `break-words` guard — an unusually long, unbroken display or community
name was the one plausible horizontal-overflow scenario found in the app.
Both now use `break-words`.

**Known limitation, not fixed**: `AppHeader`'s nav row uses `flex-wrap`,
which prevents horizontal overflow but produces several short wrapped rows
at 375px (logo, search, ~9 nav items). It is usable — everything is
reachable, nothing overflows — but visually busy on a narrow phone. A
proper fix (collapsing into a mobile menu) is a real structural/visual
change to a component every page shares, which is out of proportion for a
"fix actual issues, preserve the existing design" step; flagging it here as
the clearest candidate for a future dedicated pass.

## 7. Empty states

Audited every list surface in the app. Most were already good (feed,
notifications, messages, a fresh conversation, connections, discover,
journal — connections' empty state was the best of the set: heading +
explanation + a CTA button). Three real gaps fixed:

- **Search with no query yet** rendered nothing below the search box —
  now shows a one-line hint of what's searchable (people, posts,
  communities).
- **Search with zero results** for each section now says what to try
  next ("Try a different name or username.") instead of a bare "No X
  found."
- **Saved posts** ("No saved posts yet.") didn't explain what bookmarking
  is or how to do it — now points at the Save button on a post.

Lighter touch on Goals/Habits ("no items yet" text already existed but
had no inline link next to it — a `New goal`/`New habit` link was added
directly under the message, in addition to the header button) and the
"communities you joined" empty state (now points down at the Discover
section on the same page). No motivational copy was added anywhere — every
change is a factual "what this is / what to do," per the brief.

## 8. Safe error handling

Audited every Server Action / mutation wrapper for whether a caught
Supabase/Postgres error's raw `.message` ever reaches the browser. The
dominant, already-correct pattern app-wide: a mutation wrapper in
`src/lib/**/*-mutations.ts` classifies the Postgres error code into a small
closed set of reasons, logs the raw message to the server console only, and
the calling Server Action maps that reason to one of a handful of
hardcoded, allow-listed user-facing strings.

**One real outlier, fixed**: `src/lib/communities/community-mutations.ts`,
`callCommunityIdMutation()`. `leave_community`'s two owner-guard error
messages (raised by the RPC itself, e.g. "Community owners cannot leave
their community.") are legitimately safe to show directly — but the code
forwarded `error.message` whenever the failing RPC name was
`"leave_community"`, regardless of *which* error it actually was. That
meant an unrelated/unexpected failure from that same RPC call (anything
with a different Postgres error code, including an "unknown" one) would
also have its raw message forwarded. Fixed by additionally gating on
`classify(error.code) === "not_available"` — the one errcode that RPC is
documented to raise its two safe strings under — so an unexpected error
from the same call now collapses to the generic mapping like everywhere
else in the app.

## 9. Testing

New pure logic got a focused test, consistent with the existing convention
of testing pure `src/lib/**` functions (not components, not Supabase-calling
mutation wrappers — there's no existing test infra or convention for either
in this repo, and adding one wasn't in scope for this step):

- `src/lib/app/nav-active.test.ts` — the nav-current-path predicate (5
  cases: exact match, nested match, false-prefix rejection, unrelated path,
  null pathname).

The confirm-focus hook (`useConfirmFocus`) and the skeleton components are
not unit-tested — they're thin React/DOM glue with no meaningful pure logic
to assert on, and this repo has no component-testing setup (`environment:
"node"`, no DOM/Testing Library) to add one to without introducing a new
dependency, which the project's own rules ask to avoid unless necessary.

## 10. Remaining limitations

- `AppHeader` mobile nav clutter (see §6) — usable, not broken, flagged
  for a future pass.
- `communities/loading.tsx` can briefly show a mismatched skeleton shape
  when navigating straight into a specific community (see §1).
- No live browser was available in this environment — mobile-viewport,
  loading-skeleton, and focus-visibility verification were done by static
  code/Tailwind-class review and a production build, not by looking at
  actual rendered pixels or running an interaction test. See the manual
  regression checklist below for what still needs a human pass.

## 11. Manual regression checklist

Run through this once in a real browser before shipping:

- [ ] `/home`, `/discover`, `/communities`, `/notifications`, `/search` —
      throttle the network and confirm each shows its own skeleton shape
      briefly, with no layout jump once real content arrives.
- [ ] Force an error in a protected page (e.g. temporarily throw in a
      server component) and confirm `(protected)/error.tsx` renders with
      the header intact, and "Try again" recovers via `reset()`.
- [ ] Force an error on `/login` or another public route and confirm the
      new `app/error.tsx` renders (not the full-document
      `global-error.tsx`).
- [ ] Visit a nonexistent URL while signed out (root 404) and while signed
      in on e.g. `/goals/999999` (protected 404) — confirm the header is
      present only in the signed-in case, and "Go to your feed" works
      there.
- [ ] Tab through: the app nav (confirm the current page is visually and
      programmatically marked), a post's delete confirm step, a comment's
      delete confirm step, and the block-user confirm step — confirm focus
      visibly lands on Cancel/Keep each time, not on `<body>`.
- [ ] At 375px width: `/home`, `/feed`, `/profile/[username]` (with a long
      display name), `/communities/[slug]` (with a long community name),
      `/messages`, `/goals`, `/habits`, `/journal`, `/settings/profile` —
      confirm no horizontal scroll and the nav, while busy, stays usable.
- [ ] Confirm `/sw.js` still returns 200 and the PWA manifest/icons from
      Pass 8 Step 1 are unaffected.
