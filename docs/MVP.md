# Diong MVP Scope

## MVP Goal

The MVP should prove that one developer can ship a dependable personal-development web app where users can register, complete onboarding, read a Daily Prime Protocol, take action, track basic goals and habits, journal privately, and interact in a simple supportive community.

## Included Features

- Public landing page.
- Email registration.
- Email login.
- Password reset.
- Onboarding.
- User profile.
- Goal-interest selection.
- Daily Prime Protocol.
- Action Trigger completion.
- Private journal.
- Personal goals.
- Simple habit tracker.
- Habit completion logs.
- Streak tracking.
- Basic social feed.
- User-created posts.
- Likes.
- Comments.
- Following.
- Basic notifications.
- Account settings.

## Excluded Features

- Direct messaging.
- Live video or audio.
- Marketplace functionality.
- Professional coaches.
- Complex gamification.
- Native mobile apps.
- Advanced AI coaching.
- AI mental-health advice.
- Corporate plans.
- Advanced analytics.
- Multiple paid subscription tiers.

## Major Feature Acceptance Criteria

### Public Landing Page

- Visitors can understand what Diong is and who it is for.
- Visitors can navigate to registration, login, about, how-it-works, privacy, and terms pages.
- Copy avoids medical, neurological, and guaranteed-success claims.

### Authentication

- Users can register with email and password.
- Users can log in with valid credentials.
- Users can request a password reset email.
- Authenticated pages redirect unauthenticated users to login.
- Logged-in users are not asked to register again.

### Onboarding And Profile

- New users are directed to onboarding after registration.
- Users can choose goal interests.
- Users can create a basic profile with display name and username.
- Username validation prevents duplicates, reserved words, and invalid characters.
- Users can later update basic profile and account settings.

### Daily Prime Protocol

- Authenticated users can view one assigned Daily Prime Protocol.
- A Prime Protocol may include title, category, purpose, best time, prime text, action trigger, tomorrow's expectation, and reflection prompt.
- Users can mark the Action Trigger as complete.
- The product records completion without implying guaranteed personal change.

### Journal

- Users can create, edit, view, and delete their own private journal entries.
- Journal entries are never shown in the community feed.
- Empty states encourage the user to start writing without pressure.

### Goals

- Users can create, edit, complete, archive, and delete their own goals.
- Goals can include a title, optional description, status, and target date.
- Users can add simple goal updates.

### Habits And Streaks

- Users can create habits with a name, cadence, and optional reminder preference.
- Users can log habit completions by date.
- Streaks are calculated from completion logs.
- Duplicate logs for the same habit and date are prevented.

### Community

- Users can publish text posts.
- Users can like and unlike posts.
- Users can comment on posts.
- Users can follow and unfollow other users.
- Feed content only includes user-created posts and allowed profile information.
- Users cannot see private journals, private goals, private habits, or private completions unless later explicitly shared by the owner.

### Notifications

- Users can receive basic notifications for likes, comments, follows, and relevant system events.
- Users can mark notifications as read.
- Notifications should not expose private content.

### Account Settings

- Users can update profile details and account preferences.
- Users can manage password reset flow through Supabase Authentication.
- Users can sign out.

## Important Edge Cases

- Duplicate email registration.
- Expired or invalid password reset links.
- Username already taken.
- User skips onboarding or refreshes midway.
- No Prime Protocol assigned for the day.
- User tries to complete the same Action Trigger twice.
- User creates an empty post, comment, journal entry, goal, or habit.
- User deletes content with dependent likes, comments, logs, or notifications.
- User attempts to access another user's private data.
- Feed is empty because the user follows nobody or no posts exist.
- Network or Supabase errors during save actions.

## Definition Of MVP Completion

The MVP is complete when all included features have working user-facing flows, protected routes enforce authentication, private data is protected by database policies, core empty/loading/error states exist, lint and production build pass, and the excluded features remain out of scope.
