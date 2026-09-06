begin;

-- Diong Connections (V1, Phase B): server-side database operations.
-- Additive migration. Depends on 202609060001_connections.sql.
-- No routes, UI or AI. connection_interactions remains append-only; the only
-- write path is the SECURITY DEFINER RPC below.

-- ---------------------------------------------------------------------------
-- record_connection_interaction
-- ---------------------------------------------------------------------------
-- Records one interaction for a connection the caller owns and moves the
-- denormalised connections.last_meaningful_contact_at forward in the same
-- transaction. The caller never supplies user_id.

create function public.record_connection_interaction(
  p_connection_id bigint,
  p_interaction_type text,
  p_occurred_at timestamptz default now(),
  p_notes text default null
)
returns table (
  interaction_id bigint,
  connection_id bigint,
  occurred_at timestamptz,
  last_meaningful_contact_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  clean_notes text := nullif(btrim(p_notes), '');
  effective_occurred_at timestamptz := coalesce(p_occurred_at, now());
  new_interaction_id bigint;
  resulting_last_contact timestamptz;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if p_interaction_type is null or p_interaction_type not in (
    'message', 'call', 'video', 'in_person', 'email', 'other'
  ) then
    raise exception using errcode = '22023', message = 'Interaction type is invalid.';
  end if;

  if clean_notes is not null and char_length(clean_notes) > 2000 then
    raise exception using errcode = '22023', message = 'Interaction notes are too long.';
  end if;

  -- Reject clearly future-dated interactions; tolerate minor client clock skew
  -- by clamping anything within five minutes ahead back to now().
  if effective_occurred_at > now() + interval '5 minutes' then
    raise exception using errcode = '22023', message = 'Interaction time cannot be in the future.';
  end if;
  effective_occurred_at := least(effective_occurred_at, now());

  -- Ownership check. Also the only place the connection is resolved, so an
  -- interaction can never be attached to another user's connection.
  if not exists (
    select 1
    from public.connections
    where connections.id = p_connection_id
      and connections.user_id = current_user_id
  ) then
    raise exception using errcode = '42501', message = 'This connection is not available.';
  end if;

  insert into public.connection_interactions (
    user_id, connection_id, interaction_type, occurred_at, notes
  )
  values (
    current_user_id, p_connection_id, p_interaction_type, effective_occurred_at, clean_notes
  )
  returning id into new_interaction_id;

  -- Move last_meaningful_contact_at forward only. Recording an older
  -- interaction never moves it backwards.
  update public.connections
  set last_meaningful_contact_at = greatest(
    coalesce(connections.last_meaningful_contact_at, effective_occurred_at),
    effective_occurred_at
  )
  where connections.id = p_connection_id
    and connections.user_id = current_user_id
  returning connections.last_meaningful_contact_at into resulting_last_contact;

  return query
  select new_interaction_id, p_connection_id, effective_occurred_at, resulting_last_contact;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_connection_nudges
-- ---------------------------------------------------------------------------
-- Deterministic, read-only. Returns the caller's active connections with a
-- calculated nudge status. No AI, no persisted nudge state.
--
-- Calendar-day math uses UTC ((now() at time zone 'UTC')::date) so results do
-- not depend on the database session time zone. A user whose local day differs
-- from UTC may see a connection tick from "approaching" to "due" up to a day
-- earlier or later than their own midnight. A per-user time zone would remove
-- this; it is out of scope for V1 and matches the existing Daily Prime engine.
--
-- Status rules (checked in order):
--   never_contacted : last_meaningful_contact_at is null and either no rhythm
--                     is set, or fewer than `preferred_contact_days` days have
--                     passed since the connection was created.
--   due             : never contacted and the rhythm has elapsed since
--                     creation; OR days_since >= preferred_contact_days
--                     (exactly at the rhythm counts as due).
--   approaching     : within a restrained window before the rhythm elapses.
--                     window = least(14, greatest(2, ceil(rhythm * 0.2)),
--                                    greatest(0, rhythm - 1)) days.
--                     ~20% of the rhythm, min 2 days, hard cap 14 days, and
--                     never the whole rhythm.
--   up_to_date      : rhythm is null (informational, never nagged), or the
--                     next contact is not yet close.
-- days_since is clamped at 0 so a future-dated last-contact value (clock
-- anomaly) can never produce a negative number.

create function public.get_connection_nudges()
returns table (
  connection_id bigint,
  name text,
  connection_type text,
  connection_purpose text,
  last_meaningful_contact_at timestamptz,
  preferred_contact_days integer,
  days_since integer,
  status text
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  return query
  select
    c.id,
    c.name,
    c.connection_type,
    c.connection_purpose,
    c.last_meaningful_contact_at,
    c.preferred_contact_days,
    d.days_since,
    s.status
  from public.connections as c
  cross join lateral (
    select
      case
        when c.last_meaningful_contact_at is null then null
        else greatest(
          0,
          (now() at time zone 'UTC')::date
            - (c.last_meaningful_contact_at at time zone 'UTC')::date
        )
      end as days_since,
      greatest(
        0,
        (now() at time zone 'UTC')::date - (c.created_at at time zone 'UTC')::date
      ) as days_since_created,
      case
        when c.preferred_contact_days is null then null
        else least(
          14,
          greatest(2, ceil(c.preferred_contact_days::numeric * 0.2)::int),
          greatest(0, c.preferred_contact_days - 1)
        )
      end as approaching_window
  ) as d
  cross join lateral (
    select case
      when c.last_meaningful_contact_at is null then
        case
          when c.preferred_contact_days is not null
               and d.days_since_created >= c.preferred_contact_days
            then 'due'
          else 'never_contacted'
        end
      when c.preferred_contact_days is null then 'up_to_date'
      when d.days_since >= c.preferred_contact_days then 'due'
      when d.days_since >= c.preferred_contact_days - d.approaching_window then 'approaching'
      else 'up_to_date'
    end as status
  ) as s
  where c.user_id = current_user_id
    and c.is_active
  order by
    case s.status
      when 'due' then 0
      when 'never_contacted' then 1
      when 'approaching' then 2
      else 3
    end,
    d.days_since desc nulls last,
    c.created_at asc;
end;
$$;

revoke all on function public.record_connection_interaction(bigint, text, timestamptz, text)
  from public, anon;
revoke all on function public.get_connection_nudges() from public, anon;

grant execute on function public.record_connection_interaction(bigint, text, timestamptz, text)
  to authenticated;
grant execute on function public.get_connection_nudges() to authenticated;

commit;
