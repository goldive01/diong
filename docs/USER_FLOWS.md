# Diong User Flows

## Registration

1. Visitor opens `/register`.
2. Visitor enters email, password, and required consent confirmations.
3. System validates the form and creates a Supabase Auth user.
4. System creates or prepares the user's profile record.
5. User is directed to `/onboarding`.
6. If registration fails, the page explains the issue and keeps entered non-sensitive fields.

## Login

1. Visitor opens `/login`.
2. Visitor enters email and password.
3. System validates credentials with Supabase Auth.
4. If the user has not completed onboarding, redirect to `/onboarding`.
5. If onboarding is complete, redirect to `/home`.
6. If login fails, show a clear error without revealing whether an email exists.

## Onboarding

1. Authenticated user opens `/onboarding`.
2. Completed users are redirected to `/home`; incomplete users see the three-stage flow.
3. User sets a display name, normalized username and optional bio.
4. User chooses 1–5 active interests.
5. User confirms the summary. Client checks support usability; the server repeats all validation.
6. A transaction replaces the user's selections, updates only their profile, and marks onboarding complete last.
7. User is redirected to `/home`.

## Viewing And Updating Profiles

1. A completed authenticated user opens `/profile/[username]`.
2. The server loads only a completed profile's display name, username, optional bio and active interest names.
3. Unknown or incomplete usernames return not found.
4. The user opens `/settings/profile` to update their own username, display name or bio.
5. Shared server validation and RLS prevent invalid or cross-user updates.

## Reading A Daily Prime Protocol

1. Authenticated user opens `/daily-prime` or follows the Daily Prime prompt from `/home`.
2. System loads today's assigned Prime Protocol.
3. User reads the title, category, purpose, best time, prime text, Action Trigger, tomorrow's expectation, and reflection prompt when available.
4. User can move to Action Trigger completion or journal reflection.
5. If no protocol is assigned, show an empty state and do not create fake content.

## Completing An Action Trigger

1. User opens the Daily Prime Protocol.
2. User reviews the Action Trigger.
3. User selects the completion action after doing the task.
4. System records a completion for the user, protocol, and date.
5. UI confirms completion and prevents duplicate completion for the same assignment.

## Writing A Journal Entry

1. User opens `/journal`.
2. User selects new entry.
3. User writes private journal content, optionally connected to a Prime Protocol, goal, or habit.
4. System validates that content is not empty.
5. System saves the entry as private to the user.
6. User can view, edit, or delete the entry later.

## Creating A Goal

1. User opens `/goals`.
2. User selects create goal.
3. User enters title, optional description, and optional target date.
4. System validates required fields.
5. System saves the goal as private to the user.
6. Goal appears in the user's goal list.

## Creating A Habit

1. User opens `/habits`.
2. User selects create habit.
3. User enters habit name, cadence, and optional reminder preference.
4. System validates required fields.
5. System saves the habit as private to the user.
6. Habit appears in the user's habit tracker.

## Completing A Habit

1. User opens `/habits`.
2. User finds the habit for today.
3. User marks the habit complete.
4. System creates a habit log for the user, habit, and date.
5. System updates the displayed streak from logs.
6. If a log already exists for that date, completion is not duplicated.

## Publishing A Social Post

1. User opens `/community`.
2. User writes a post.
3. System validates that post content is not empty and is within length limits.
4. User publishes the post.
5. Post appears in the feed with the user's public profile details.
6. Private journals, goals, habits, and completion logs are not attached automatically.

## Liking And Commenting

1. User opens `/community` or another user's profile.
2. User selects like on a post.
3. System creates a like if one does not already exist, or removes it when unliked.
4. User writes a comment.
5. System validates the comment and saves it.
6. Post owner receives a basic notification when appropriate.

## Following Another User

1. User opens `/profile/[username]`.
2. User reviews public profile information and public posts.
3. User selects follow.
4. System creates a follow relationship.
5. Followed user's posts can appear in the user's feed.
6. User can unfollow later.

## Updating Account Settings

1. User opens `/settings`.
2. User updates profile fields or preferences.
3. System validates changes.
4. System saves updates.
5. User can request password reset or sign out.
6. Errors are shown without exposing sensitive account details.
