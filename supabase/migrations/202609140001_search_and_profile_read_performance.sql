begin;

-- Diong Read-Path Performance — Pass 8 Step 3: closes the two concrete,
-- evidence-based gaps found while auditing every major read path for N+1
-- queries and over-fetching (feed, post detail, saved posts, profiles,
-- communities, community posts, messages, notifications, search, discover).
-- Every one of those surfaces already reads through a single, fully-hydrated
-- SECURITY DEFINER RPC per screen (no JS/TS loop issuing one Supabase call
-- per row) — this migration does NOT change that architecture. It adds:
--
--   1. Trigram indexes behind the three existing ILIKE-based search RPCs
--      (search_people / search_posts / search_communities), which currently
--      run a full sequential scan on every query — a gap this repo's own
--      comments already flagged as a known, deferred V1 trade-off.
--   2. One new RPC, get_interest_names(), replacing a two-step plain-table
--      client read (user_interests -> interests) used on /home and
--      /profile/[username] with a single round trip, matching the RPC
--      convention used by every other read in this app. As a byproduct this
--      also closes a latent privacy gap: the pre-existing client-readable
--      RLS policy on user_interests permits reading another (completed)
--      profile's interest selections with no block check at the database
--      layer — the application only avoided this by skipping the call when
--      social.viewer_blocked is true, which a direct API call could bypass.
--      get_interest_names() re-checks blocking itself, the same
--      defense-in-depth pattern every other RPC in this schema already
--      follows, so the read path stays viewer-safe even if called directly.
--
-- Additive only. No existing table, column, RPC signature, RLS policy or
-- grant is altered or dropped. Apply once, in order, after
-- 202609130002_media_profile_polish.sql. Depends on public.profiles /
-- public.posts / public.communities (for the trigram indexes) and
-- public.user_interests / public.interests / public.blocked_between()
-- (for get_interest_names()). Single transaction, not idempotent — never
-- re-run a migration that already succeeded.

-- ---------------------------------------------------------------------------
-- 1. Trigram indexes for the existing ILIKE '%…%' search predicates
-- ---------------------------------------------------------------------------
-- A leading-wildcard ILIKE cannot use a plain btree index. pg_trgm's GIN
-- indexes accelerate exactly this pattern without any change to the RPCs'
-- SQL text, return shape, or the application code that calls them — this is
-- an index addition only, not full-text-search infrastructure (no tsvector
-- column, no ranking/relevance change). CREATE INDEX (not CONCURRENTLY) is
-- used because this migration, like every other one in this repo, runs
-- inside a single transaction — CONCURRENTLY cannot run inside one. On a
-- much larger posts/profiles/communities table than this app's expected V1
-- size, that means a brief write lock while each index builds; acceptable
-- here, called out for whoever runs this against a bigger dataset later.
--
-- Each index's partial WHERE clause mirrors the exact predicate its RPC
-- already applies, so the planner can actually use it:
--   search_people (…media_profile_polish.sql):      where p.onboarding_completed and (username/display_name/bio ilike …)
--   search_posts  (…media_profile_polish.sql):      where p.deleted_at is null and p.body ilike …
--   search_communities (…communities.sql):          where c.is_active and (name/slug/description ilike …)

create extension if not exists pg_trgm;

create index if not exists profiles_username_trgm_idx
  on public.profiles using gin (username gin_trgm_ops)
  where onboarding_completed;

create index if not exists profiles_display_name_trgm_idx
  on public.profiles using gin (display_name gin_trgm_ops)
  where onboarding_completed;

create index if not exists profiles_bio_trgm_idx
  on public.profiles using gin (bio gin_trgm_ops)
  where onboarding_completed;

create index if not exists posts_body_trgm_idx
  on public.posts using gin (body gin_trgm_ops)
  where deleted_at is null;

create index if not exists communities_name_trgm_idx
  on public.communities using gin (name gin_trgm_ops)
  where is_active;

create index if not exists communities_slug_trgm_idx
  on public.communities using gin (slug gin_trgm_ops)
  where is_active;

create index if not exists communities_description_trgm_idx
  on public.communities using gin (description gin_trgm_ops)
  where is_active;

-- ---------------------------------------------------------------------------
-- 2. get_interest_names() — one round trip instead of two, viewer-safe
-- ---------------------------------------------------------------------------
-- Security boundary: the caller must be authenticated. A viewer may always
-- read their own interest selections. For any other target user, the
-- interests are returned only when that profile has completed onboarding
-- (the same condition the pre-existing user_interests RLS select policy
-- already requires) AND no block stands between the two accounts in either
-- direction (blocked_between() — the same helper every other viewer-facing
-- RPC in this schema uses). p_user_id is a plain lookup key here, never an
-- authorization input by itself — auth.uid() is what determines the
-- viewer's own identity, matching every other RPC in this repo.
create function public.get_interest_names(p_user_id uuid)
returns table (name text)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_viewer uuid := auth.uid();
begin
  if v_viewer is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if v_viewer <> p_user_id then
    if public.blocked_between(v_viewer, p_user_id) then
      return;
    end if;
    if not exists (
      select 1 from public.profiles
      where id = p_user_id and onboarding_completed
    ) then
      return;
    end if;
  end if;

  return query
  select i.name
  from public.user_interests ui
  join public.interests i on i.id = ui.interest_id
  where ui.user_id = p_user_id
    and i.is_active
  order by i.sort_order, i.id;
end;
$$;

revoke all on function public.get_interest_names(uuid) from public, anon;
grant execute on function public.get_interest_names(uuid) to authenticated;

commit;
