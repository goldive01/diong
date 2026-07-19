# Profile And Onboarding Setup

This phase adds Supabase SSR authentication support, profiles, interests, onboarding, profile settings and authenticated public profile pages. It does not add Daily Prime assignment or later roadmap features.

## Migration To Run

Run `supabase/migrations/202607190001_onboarding_and_profiles.sql` against the target Supabase project.

If the Supabase CLI is already linked and configured, run:

```bash
supabase db push
```

Do not put a service-role key in the application. The web app needs only these values in `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## Apply With Supabase SQL Editor

When local migration tooling is not configured:

1. Back up any existing production data and test in a non-production project first.
2. Open the target project in Supabase Dashboard, then open **SQL Editor**.
3. Open `supabase/migrations/202607190001_onboarding_and_profiles.sql` locally and copy the complete file.
4. Create a new SQL Editor query, paste the migration, review the selected project, and run it once.
5. Confirm the transaction completed without an error before testing registration.
6. Record the filename and application date in the deployment record. Do not rerun the complete table-creation migration against a database where it already succeeded.

## Verify Tables And Seed Data

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'interests', 'user_interests')
order by table_name;

select slug, name, sort_order, is_active
from public.interests
order by sort_order, id;
```

Expect three tables and twelve active seeded interests.

## Verify RLS And Policies

```sql
select relname, relrowsecurity
from pg_class
where oid in (
  'public.profiles'::regclass,
  'public.interests'::regclass,
  'public.user_interests'::regclass
)
order by relname;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'interests', 'user_interests')
order by tablename, cmd, policyname;
```

Every `relrowsecurity` value must be `true`. Confirm writes are operation-specific: profiles are owner-insert/owner-update, interests have no normal-user writes, and user interests are owner-insert/owner-delete. Completed users' selections are readable by authenticated users solely to support authenticated profile pages; incomplete selections remain owner-only.

## Confirm The New-User Trigger

```sql
select trigger_name, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema = 'users'
  and event_object_table = 'users'
  and trigger_name = 'on_auth_user_created';

select routine_schema, routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'handle_new_user',
    'complete_onboarding',
    'set_updated_at',
    'validate_profile_completion',
    'validate_completed_user_interest_count'
  );
```

Create a disposable user through the normal registration flow. Confirm one `profiles` row exists with the same auth user ID, no invented username, and `onboarding_completed = false`. Trigger failures can block signup, so test this before production deployment.

## Seed Or Repair Data

The migration seeds interests with `insert ... on conflict (slug) do update`, so the seed section is safe to reapply on its own. Do not reapply the full migration.

The migration also backfills every missing auth-user profile without overwriting existing profiles. To repair one existing test user idempotently in SQL Editor:

```sql
insert into public.profiles (id)
select id from auth.users where email = 'test-user@example.com'
on conflict (id) do nothing;
```

Verify the email first and use only a disposable test user. Email remains in `auth.users` and is never copied to `profiles`.

## Exact Manual Test Sequence

1. Set the two public Supabase environment variables, apply the migration, and restart the development server.
2. In a private browser window, request `/onboarding`; confirm redirect to `/login`.
3. Register user A, complete email confirmation through `/auth/callback`, and confirm the user reaches `/onboarding`.
4. Refresh `/home` before completion; confirm redirect back to `/onboarding` without a loop.
5. Try a two-character username, invalid punctuation, and a reserved name such as `admin`; confirm field/form errors.
6. Enter uppercase letters; confirm the username is normalized to lowercase.
7. Submit with zero interests, then attempt more than five; confirm both are prevented or rejected.
8. Complete onboarding with valid identity details and 1–5 interests. Double-click the final button; confirm only one completion occurs and redirect is to `/home`.
9. Confirm `/onboarding` now redirects user A to `/home`.
10. Confirm `/home` shows the display name, username, selected interest names, coming-next Daily Prime card, and logout control—without fake data.
11. Open `/settings/profile`. Submit invalid changes and confirm values remain. Submit valid changes and confirm success plus updated `/home` and `/profile/[username]`.
12. Register user B. Attempt user A's username and confirm the friendly duplicate error, including a final-submit race test from two sessions.
13. As user B, open user A's `/profile/[username]`; confirm only display name, username, optional bio, and interest names appear. Confirm no email, metadata or internal IDs render.
14. Request an unknown username and an incomplete profile username; confirm the proper not-found page.
15. Using Supabase clients authenticated separately as users A and B, confirm B cannot update A's profile, insert/delete A's interest selections, or read A's incomplete selections. Confirm B can read active interests and A's completed public selections.
16. Log out and confirm `/home`, `/settings/profile`, and `/profile/[username]` redirect to `/login`.
17. Re-test login, registration callback, forgot-password email, callback to `/reset-password`, password update, and login with the new password.

## Rollback Considerations

Rollback is intentionally manual because dropping these tables deletes profile and selection data. Back up data first. In reverse dependency order: remove the auth trigger, revoke/drop `complete_onboarding`, drop the remaining functions/triggers, then drop `user_interests`, `interests`, and `profiles`. Remove application routes only after the database rollback and restore the previous route behavior. Never drop `auth.users`. A forward corrective migration is safer than rollback after real users have completed onboarding.
