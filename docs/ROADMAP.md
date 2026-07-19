# Diong Roadmap

This roadmap is scoped for one developer. Each phase should be small enough to build, test, and review without introducing unrelated future features.

## Phase 1: Project Foundation And Public Landing Page

- Confirm Next.js App Router, TypeScript, Tailwind CSS, lint, and production build.
- Refine public landing page for Diong positioning.
- Add public pages: `/about`, `/how-it-works`, `/privacy`, `/terms`.
- Keep claims practical and avoid medical, neurological, or guaranteed-success language.
- Completion: public routes exist, copy is aligned with product positioning, lint and build pass.

## Phase 2: Supabase Setup, Authentication And Protected Routes

- Create Supabase project configuration.
- Add Supabase client/server helpers without exposing service-role keys in browser code.
- Implement email registration, email login, password reset, and logout.
- Add protected route handling for authenticated pages.
- Completion: auth flows work, protected routes redirect correctly, secrets are handled safely.

## Phase 3: Onboarding And User Profiles

- Create profile and user-interest data model.
- Implement onboarding for username, display name, and goal interests.
- Add profile display and account settings basics.
- Completion: new users complete onboarding before using main app routes; username validation works.
- Implemented in this phase: versioned migration and RLS, secure profile creation/repair, three-stage onboarding, personalised home shell, authenticated public profile display, profile settings, and the minimum Supabase SSR auth foundation absent from the prior checkout.
- Deferred as planned: Daily Prime assignment and all Phase 4+ functionality.

## Phase 4: Prime Protocol Database And Daily Prime Experience

- Create Prime Protocol, assignment, and completion tables.
- Add initial admin-managed seed content through a safe local or admin-only workflow.
- Implement `/daily-prime` with one assigned protocol per user per day.
- Implement Action Trigger completion.
- Completion: users can read and complete a Daily Prime without duplicate completions.

## Phase 5: Journaling, Goals And Habits

- Implement private journal entries.
- Implement personal goals and goal updates.
- Implement habits and habit completion logs.
- Add streak calculation from habit logs.
- Completion: private productivity data is owner-only and core create/update/delete flows work.

## Phase 6: Social Feed, Posts, Likes, Comments And Follows

- Implement basic community feed.
- Add user-created posts, likes, comments, and follows.
- Add profile pages with public posts.
- Enforce that private journals, goals, habits, and completions do not appear automatically.
- Completion: authenticated users can post and interact without accessing private data.

## Phase 7: Notifications And Admin Content Management

- Add notifications for likes, comments, follows, and key system events.
- Add read/unread notification states.
- Add a minimal admin content workflow for Prime Protocol management.
- Completion: users receive relevant notifications and admin content can be managed safely.

## Phase 8: eBooks, Planners, Trackers And Downloads

- Define downloadable content types and storage requirements.
- Add download pages or library views.
- Use Supabase Storage access controls for protected files.
- Completion: users can access approved resources without exposing private storage paths.

## Phase 9: AI Personalisation

- Define AI boundaries and safety rules before implementation.
- Personalise Prime Protocol suggestions or content ordering using user interests and activity.
- Do not provide mental-health advice, diagnosis, crisis guidance, or medical recommendations.
- Completion: AI features are optional, bounded, privacy-aware, and clearly positioned as personalisation.

## Phase 10: Stripe Subscriptions, Testing, Deployment And Launch

- Add a single realistic paid plan or launch pricing model if needed.
- Integrate Stripe checkout and billing portal.
- Add automated and manual checks for core user flows.
- Configure production environment variables and deploy to Vercel.
- Completion: launch checklist is complete, lint and build pass, auth and payment flows are tested, and production data policies are reviewed.
