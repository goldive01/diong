begin;

-- Fix: get_or_assign_daily_prime() fails at runtime with
--   column reference "assigned_date" is ambiguous
--
-- Root cause: the function is RETURNS TABLE (... assigned_date date ...), so
-- `assigned_date` is an output column (a variable) in scope for the entire
-- body. The only bare, value-context reference to `assigned_date` is the
-- ON CONFLICT arbiter-inference list:
--
--   on conflict (user_id, assigned_date) do nothing
--
-- PL/pgSQL parses that list as index expressions, where `assigned_date` could
-- be the output variable or the public.prime_assignments column, and raises an
-- ambiguity error. (`user_id` is not ambiguous: there is no variable by that
-- name. The two other references, `assignments.assigned_date` in the RETURN
-- QUERY select list and WHERE clause, are already alias-qualified and fine.)
--
-- Fix: name the arbiter constraint explicitly instead of inferring it from a
-- bare column list. The constraint is the unnamed `unique (user_id,
-- assigned_date)` created for public.prime_assignments in
-- 202607270001_prime_protocol_engine.sql, which PostgreSQL auto-names
-- `prime_assignments_user_id_assigned_date_key`. Verify with:
--
--   select conname from pg_constraint
--   where conrelid = 'public.prime_assignments'::regclass and contype = 'u';
--
-- If that query reports a different name, substitute it below before running.
--
-- Behaviour is unchanged: one assignment per user per day, the existing
-- assignment is returned on a repeat request, published protocols only,
-- interest-aware ordering, owner-scoped through auth.uid(). The RETURNS TABLE
-- signature is byte-for-byte identical, so CREATE OR REPLACE is sufficient and
-- existing EXECUTE grants are preserved (re-asserted below for completeness).

create or replace function public.get_or_assign_daily_prime()
returns table (
  assignment_id bigint,
  assigned_date date,
  protocol_id bigint,
  category_name text,
  title text,
  purpose text,
  best_time text,
  prime_text text,
  action_trigger text,
  tomorrows_expectation text,
  reflection_prompt text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_protocol_id bigint;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  select protocols.id
  into selected_protocol_id
  from public.prime_protocols as protocols
  join public.prime_categories as categories on categories.id = protocols.category_id
  left join public.user_interests
    on user_interests.user_id = current_user_id
    and user_interests.interest_id = categories.interest_id
  where protocols.status = 'published'
    and categories.is_active
  order by
    (user_interests.interest_id is not null) desc,
    md5(current_user_id::text || current_date::text || protocols.id::text)
  limit 1;

  if selected_protocol_id is not null then
    insert into public.prime_assignments (user_id, prime_protocol_id, assigned_date)
    values (current_user_id, selected_protocol_id, current_date)
    on conflict on constraint prime_assignments_user_id_assigned_date_key do nothing;
  end if;

  return query
  select assignments.id, assignments.assigned_date, protocols.id,
    categories.name, protocols.title, protocols.purpose, protocols.best_time,
    protocols.prime_text, protocols.action_trigger, protocols.tomorrows_expectation,
    protocols.reflection_prompt, completions.completed_at
  from public.prime_assignments as assignments
  join public.prime_protocols as protocols on protocols.id = assignments.prime_protocol_id
  join public.prime_categories as categories on categories.id = protocols.category_id
  left join public.prime_completions as completions
    on completions.prime_assignment_id = assignments.id
    and completions.user_id = current_user_id
  where assignments.user_id = current_user_id
    and assignments.assigned_date = current_date;
end;
$$;

revoke all on function public.get_or_assign_daily_prime() from public, anon;
grant execute on function public.get_or_assign_daily_prime() to authenticated;

commit;
