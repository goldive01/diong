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
| `/home` | Protected | Authenticated dashboard for daily focus. | Open Daily Prime, view habits/goals snapshot, navigate to core areas. | Dashboard skeleton. | New user prompt after onboarding. | Unable to load dashboard data. |
| `/onboarding` | Protected | Collect initial profile and goal interests. | Select interests, set username/display name, complete setup. | Form loading state. | Start onboarding prompt. | Username unavailable or save failed. |
| `/daily-prime` | Protected | Show today's assigned Prime Protocol. | Read protocol, complete Action Trigger, open journal. | Protocol card skeleton. | No protocol assigned today. | Unable to load or complete protocol. |
| `/goals` | Protected | Manage personal goals. | Create, edit, complete, archive, delete goals; add updates. | Goal list skeleton. | No goals yet. | Unable to save or load goals. |
| `/habits` | Protected | Track habits and streaks. | Create habits, log completions, view streaks. | Habit list skeleton. | No habits yet. | Unable to save habit or completion log. |
| `/journal` | Protected | Write and manage private journal entries. | Create, edit, delete, view entries. | Entry list/editor skeleton. | No journal entries yet. | Unable to save or load journal entry. |
| `/community` | Protected | Basic social feed. | Create posts, like, comment, follow from profiles. | Feed skeleton. | No posts to show. | Unable to load feed or save interaction. |
| `/notifications` | Protected | Show basic notifications. | View notifications, mark as read. | Notification list skeleton. | No notifications yet. | Unable to load or update notifications. |
| `/profile/[username]` | Protected | Show a user's public profile and posts. | View profile, follow/unfollow, interact with posts. | Profile skeleton. | User has no public posts. | User not found or profile unavailable. |
| `/settings` | Protected | Manage account and profile settings. | Update profile, preferences, request password reset, sign out. | Form loading state. | Minimal account state. | Save failed or auth action failed. |

Protected routes must redirect unauthenticated users to `/login`. Users who have not completed onboarding should be sent to `/onboarding` before normal protected app routes.
