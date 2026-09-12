# Diong Routes

## V1 routes (shipped)

| Route | Access | Page purpose | Main actions | Empty state | Error state |
| --- | --- | --- | --- | --- | --- |
| `/` | Public | Landing page for product positioning and conversion. | View value proposition; go to register / login. | Not applicable. | Root `global-error` boundary. |
| `/privacy` | Public | Privacy Notice — what data Diong holds and how it is used. | Read; link to terms. | Not applicable. | Root `global-error` boundary. |
| `/terms` | Public | Terms of Use. | Read; link to privacy. | Not applicable. | Root `global-error` boundary. |
| `/login` | Public | Authenticate existing users. | Enter email/password, submit, go to forgot password. | Not applicable. | Invalid-credentials / auth-service message (`role="alert"`). |
| `/register` | Public | Create a new account. | Enter email/password, submit; agree to Terms + Privacy. | Not applicable. | Duplicate account / weak password / auth-service message. |
| `/forgot-password` | Public | Request a password reset email. | Enter email, submit. | Not applicable. | Neutral "if an account matches" confirmation. |
| `/reset-password` | Public (recovery session) | Set a new password from a reset link. | Enter new password, submit. | Not applicable. | Expired / invalid link message. |
| `/auth/callback` | Public auth route | Exchange a Supabase PKCE code for a cookie session. | Continue to a validated local destination. | Not applicable. | Redirect to `/login?error=callback`. |
| `/onboarding` | Protected, incomplete users only | Collect identity and 1–5 interests in three stages. | Check username, select interests, confirm and save atomically. | Start-onboarding prompt. | Accessible field and form errors. |
| `/home` | Protected, onboarding required | Personal dashboard. | Open Daily Prime, open Prime history, view interests, see the Connections nudge. | Interest fallback if selections are unavailable. | Protected `error` boundary. |
| `/daily-prime` | Protected | Today's assigned Prime Protocol. | Read protocol, complete the Action Trigger, save/update today's reflection, open Prime history. | "No Daily Prime is available today." | "Your Daily Prime is unavailable." + protected `error` boundary. |
| `/daily-prime/history` | Protected | The owner's past Prime assignments, newest first, with a lightweight progress summary. | Open a historical Prime; open today's Prime. | "Your Prime journey starts with today's practice." | History falls back to an empty list; progress falls back to zeros. |
| `/daily-prime/history/[assignmentId]` | Protected | Read-only view of one past Prime assignment and the owner's saved reflection. | Read protocol and reflection; link to today's Prime when the assignment is today's. | Not applicable. | Invalid / missing / foreign id → branded 404. |
| `/connections` | Protected | Connections dashboard: nudges grouped by status, plus inactive connections. | Add a connection; open a connection. | "Keep track of the people who matter to your growth." | "Connection reminders are unavailable" if the nudge RPC fails but connections exist. |
| `/connections/new` | Protected | Add a connection. | Fill the form, save. | Not applicable. | Field + form errors; safe generic DB error. |
| `/connections/[id]` | Protected | Connection detail: facts, private notes, active state, record-interaction form, interaction history. | Record an interaction; deactivate / reactivate; go to edit. | "No interactions recorded yet." | Missing / foreign id → branded 404. |
| `/connections/[id]/edit` | Protected | Edit the six connection detail fields. | Update, save. | Not applicable. | Field + form errors; safe generic DB error. |
| `/feed` | Protected, onboarding required | Compose a post and read a chronological feed of your own posts plus public / followers-only posts from people you follow. | Write a post (type, body, visibility); like / save; open a post; **Load more**. | "Your feed is quiet for now." | Feed falls back to an empty list on a read error. |
| `/posts/[id]` | Protected, onboarding required | One post in full, with its comments, one reply level and the comment form. | Like / save; comment; reply once; edit / delete your own comment; open the author profile; edit / delete your own post. | "No comments yet." | Missing / deleted / not-visible / blocked post → branded 404 (non-disclosing). |
| `/posts/[id]/edit` | Protected, onboarding required, author only | Edit the body and visibility of your own post. | Update, save. | Not applicable. | Not visible or not your post → branded 404; field + form errors. |
| `/saved` | Protected, onboarding required | Your private list of bookmarked posts, most recently saved first. | Open a post; remove a bookmark; **Load more**. | "No saved posts yet." | Falls back to an empty list on a read error. |
| `/profile/[username]` | Protected, onboarding required | Authenticated-visible public profile with social graph and a Posts section. | View display name, username, bio, interests, follower / following counts; Follow / Unfollow; Block / Unblock; **Edit profile** on your own; read the member's visible posts. | Neutral "no posts you can see" message. | Unknown / incomplete username, or owner has blocked the viewer → branded 404. |
| `/profile/[username]/followers` | Protected, onboarding required | Paginated list of accounts following the owner. | Open a person's profile; page through. | "No followers yet." | Unknown / incomplete username, or owner has blocked the viewer → branded 404; viewer has blocked the owner → "list hidden" notice. |
| `/profile/[username]/following` | Protected, onboarding required | Paginated list of accounts the owner follows. | Open a person's profile; page through. | "Not following anyone yet." | Same as `/followers`. |
| `/settings/profile` | Protected, onboarding required | Update the owner's public profile. | Update username, display name, bio. | Existing profile values. | Field and form save errors. |

Protected routes redirect unauthenticated users to `/login`. Authoritative
checks run in server pages/layouts: incomplete users go to `/onboarding`,
`/onboarding` never redirects to itself, and completed users are redirected from
onboarding to `/home`. Proxy session refresh does not replace server
authorization checks.

## Planned for V1.1 (not implemented)

| Route | Intended purpose |
| --- | --- |
| `/about` | Explain Diong's mission, audience and boundaries. |
| `/how-it-works` | Standalone workflow explainer (currently a section on `/`). |
| `/settings` | Account-level settings index (password change, account deletion). |
| `/goals` | Personal goals — create, edit, complete, archive, delete, updates. |
| `/habits` | Habits and streaks — create habits, log completions. |
| `/journal` | Standalone private journal entries. |
| `/messages` | Direct messages. |
| `/communities` | Topic communities. |
| `/notifications` | Basic in-app notifications. |

These are not built, not linked from the app, and not advertised as available.

Follow / block / follower lists ship in the **Social Network Pass 1** slice
(`docs/SOCIAL_GRAPH_SETUP.md`). Posts, the feed, comments, likes and bookmarks
ship in the **Social Network Pass 2** slice (`docs/SOCIAL_CONTENT.md`) —
`/feed`, `/posts/[id]`, `/posts/[id]/edit` and `/saved` are listed under V1
routes above. Direct messages, communities and notifications are **not** part of
Pass 2.
