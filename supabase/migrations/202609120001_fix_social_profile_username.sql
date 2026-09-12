begin;

-- Diong — fix ambiguous "username" reference in public.get_social_profile().
--
-- Bug: get_social_profile() declares `returns table (id uuid, username text,
-- display_name text, ...)`. In PL/pgSQL, RETURNS TABLE output columns are
-- implicitly declared as OUT-parameter variables in scope for the whole
-- function body — so `username` refers to BOTH the output variable and
-- public.profiles.username. The function's lookup query used a bare
-- `username` in its WHERE clause:
--
--   select * into target
--   from public.profiles
--   where username = normalized
--     and onboarding_completed;
--
-- PL/pgSQL's default variable_conflict = 'error' behaviour then raises
-- "column reference \"username\" is ambiguous" on every call, which is
-- exactly the runtime error reported from getSocialProfile()
-- (src/lib/social/social-data.ts) on /profile/<username>.
--
-- Fix: qualify the column reference with the table's own (implicit,
-- unaliased) correlation name, `profiles.username` — resolving the
-- ambiguity without touching anything else. `onboarding_completed` is also
-- qualified defensively (it is not currently an output column, so it was not
-- ambiguous, but qualifying it costs nothing and removes any future risk if
-- an `onboarding_completed` output column is ever added).
--
-- This migration only replaces public.get_social_profile() via
-- CREATE OR REPLACE FUNCTION — the signature (p_username text, returning the
-- same nine columns) is unchanged, so existing grants, RLS, triggers and
-- every other RPC from 202609100002_social_graph.sql are untouched. That
-- already-applied migration file itself is not modified.
--
-- Audited for the same ambiguity class: follow_user(), unfollow_user(),
-- block_user(), unblock_user() (no RETURNS TABLE, so no output-column
-- shadowing is possible) and the two trigger functions
-- (enforce_follow_not_blocked(), clear_follows_on_block(), both use `new.`-
-- qualified references only) — none affected. No other function in this
-- migration is changed.

create or replace function public.get_social_profile(p_username text)
returns table (
  id uuid,
  username text,
  display_name text,
  bio text,
  follower_count integer,
  following_count integer,
  is_self boolean,
  viewer_follows boolean,
  viewer_blocked boolean
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized text := lower(btrim(coalesce(p_username, '')));
  target public.profiles;
  v_is_self boolean;
  v_blocked_by boolean;
  v_viewer_blocked boolean;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if normalized !~ '^[a-z0-9_]{3,30}$' then
    return;
  end if;

  select * into target
  from public.profiles
  where profiles.username = normalized
    and profiles.onboarding_completed;

  if not found then
    return;
  end if;

  v_is_self := target.id = current_user_id;

  v_blocked_by := (not v_is_self) and exists (
    select 1 from public.blocks
    where blocker_id = target.id and blocked_id = current_user_id
  );
  if v_blocked_by then
    return;
  end if;

  v_viewer_blocked := (not v_is_self) and exists (
    select 1 from public.blocks
    where blocker_id = current_user_id and blocked_id = target.id
  );

  return query
  select
    target.id,
    target.username,
    target.display_name,
    case when v_viewer_blocked then null else target.bio end,
    case
      when v_viewer_blocked then null
      else (select count(*)::integer from public.follows where following_id = target.id)
    end,
    case
      when v_viewer_blocked then null
      else (select count(*)::integer from public.follows where follower_id = target.id)
    end,
    v_is_self,
    (not v_is_self) and exists (
      select 1 from public.follows
      where follower_id = current_user_id and following_id = target.id
    ),
    v_viewer_blocked;
end;
$$;

-- Execution privileges are not reset by CREATE OR REPLACE FUNCTION when the
-- signature is unchanged (they already are: authenticated only, no anon /
-- public). Reasserted here anyway, defensively and idempotently, purely for
-- migration self-documentation — this changes nothing.
revoke all on function public.get_social_profile(text) from public, anon;
grant execute on function public.get_social_profile(text) to authenticated;

commit;
