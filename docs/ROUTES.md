# Diong Routes

| Route | Access | Page purpose | Main actions | Loading state | Empty state | Error state |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | Public | Landing page for product positioning and conversion. | View value proposition, navigate to register/login. | Skeleton or static page load. | Not applicable. | Generic page load error. |
| `/about` | Public | Explain Diong's mission, audience, and boundaries. | Read product context, navigate to register. | Text section placeholders. | Not applicable. | Page unavailable message. |
| `/how-it-works` | Public | Explain Prime Protocols, Action Triggers, goals, habits, journal, and community. | Learn workflow, navigate to register. | Section placeholders. | Not applicable. | Page unavailable message. |
| `/login` | Public | Authenticate existing users. | Enter email/password, submit, go to forgot password. | Button pending state. | Not applicable. | Invalid credentials or auth service error. |
| `/register` | Public | Create a new account. | Enter email/password, accept required terms, submit. | Button pending state. | Not applicable. | Duplicate account, weak password, or auth service error. |
| `/forgot-password` | Public | Request a password reset email. | Enter email, submit reset request. | Button pending state. | Not applicable. | Reset request failed message. |
| `/reset-password` | Public | Set a new password from a reset link. | Enter new password, submit. | Button pending state. | Not applicable. | Expired link, invalid token, or weak password. |
| `/privacy` | Public | Explain privacy practices and data handling. | Read policy. | Text placeholders. | Not applicable. | Page unavailable message. |
| `/terms` | Public | Explain terms of use. | Read terms. | Text placeholders. | Not applicable. | Page unavailable message. |
| `/home` | Protected, onboarding required | Personalised dashboard shell. | View profile identity and interests, open settings, log out. | Server page load. | Interest fallback if selections are unavailable. | Unable to load profile data. |
| `/onboarding` | Protected, incomplete users only | Collect identity and 1–5 interests in three stages. | Check username, select interests, confirm and save atomically. | Pending availability/save states. | Start onboarding prompt. | Accessible field and form errors. |
| `/daily-prime` | Protected | Show today's assigned Prime Protocol. | Read protocol, complete Action Trigger, open journal. | Protocol card skeleton. | No protocol assigned today. | Unable to load or complete protocol. |
| `/goals` | Protected | Manage personal goals. | Create, edit, complete, archive, delete goals; add updates. | Goal list skeleton. | No goals yet. | Unable to save or load goals. |
| `/habits` | Protected | Track habits and streaks. | Create habits, log completions, view streaks. | Habit list skeleton. | No habits yet. | Unable to save habit or completion log. |
| `/journal` | Protected | Write and manage private journal entries. | Create, edit, delete, view entries. | Entry list/editor skeleton. | No journal entries yet. | Unable to save or load journal entry. |
| `/community` | Protected | Basic social feed. | Create posts, like, comment, follow from profiles. | Feed skeleton. | No posts to show. | Unable to load feed or save interaction. |
| `/notifications` | Protected | Show basic notifications. | View notifications, mark as read. | Notification list skeleton. | No notifications yet. | Unable to load or update notifications. |
| `/profile/[username]` | Protected, onboarding required | Show an authenticated-visible public profile. | View display name, username, optional bio and interests. | Server page load. | Neutral future-activity message. | Unknown/incomplete username returns not found. |
| `/settings` | Protected | Manage account and profile settings. | Update profile, preferences, request password reset, sign out. | Form loading state. | Minimal account state. | Save failed or auth action failed. |
| `/settings/profile` | Protected, onboarding required | Update the owner's public profile. | Update username, display name and bio. | Button pending state. | Existing profile values. | Field and form save errors. |
| `/auth/callback` | Public auth route | Exchange a Supabase PKCE code for a cookie session. | Continue to a validated local destination. | Redirect. | Not applicable. | Redirect to login with callback error. |

Protected routes redirect unauthenticated users to `/login`. Authoritative checks run in server pages/layouts: incomplete users go to `/onboarding`, `/onboarding` never redirects to itself, and completed users are redirected from onboarding to `/home`. Proxy session refresh does not replace server authorization checks. Auth callback and password-recovery routes remain public.
