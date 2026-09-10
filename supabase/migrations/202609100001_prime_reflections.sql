begin;

-- Phase G: Daily Prime completion reflections.
--
-- Additive only. Adds a single nullable `reflection` column to
-- public.prime_completions and one SECURITY DEFINER function to write it.
--
-- Nothing in this migration alters an existing table, RPC, grant or policy:
--   * public.prime_completions keeps SELECT-only access for `authenticated`
--     (no INSERT/UPDATE/DELETE grant, one owner-only SELECT policy). The
--     reflection is written exclusively by the function below, matching the
--     Prime engine's existing RPC-only write model from
--     202607270001_prime_protocol_engine.sql.
--   * get_or_assign_daily_prime() and complete_daily_prime() are unchanged.
--   * completed_at remains the authoritative record that a Prime was completed;
--     a reflection is optional metadata on an existing completion row.
--
-- Do not edit an already-applied migration. Apply this file once, in order,
-- after 202609080001_fix_daily_prime_assigned_date.sql.

alter table public.prime_completions
  add column reflection text;

alter table public.prime_completions
  add constraint prime_completions_reflection_length
    check (reflection is null or char_length(reflection) <= 2000);

-- public.save_prime_reflection(p_assignment_id, p_reflection)
--
-- Saves (or updates, or clears) the reflection on the caller's completion for
-- their own assignment. Returns the completion's completed_at, which stays
-- authoritative and is never modified here.
--
-- Rules, all enforced server-side:
--   1. An authenticated user is required (42501 otherwise).
--   2. p_reflection is trimmed; blank becomes null. Longer than 2000 chars is
--      rejected (22023) before any write.
--   3. The assignment must belong to auth.uid() AND be today's assignment
--      (assigned_date = current_date). Historical assignments are read-only.
--   4. A completion row for that assignment must already exist (you reflect
--      after completing). If not, 42501.
--   5. Only the `reflection` column is written. user_id, completed_at,
--      completion_date and prime_assignment_id are never touched.
create function public.save_prime_reflection(
  p_assignment_id bigint,
  p_reflection text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_reflection text;
  result_completed_at timestamptz;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  normalized_reflection := nullif(btrim(coalesce(p_reflection, '')), '');

  if normalized_reflection is not null
     and char_length(normalized_reflection) > 2000 then
    raise exception using errcode = '22023',
      message = 'Reflection cannot be longer than 2000 characters.';
  end if;

  if not exists (
    select 1
    from public.prime_assignments
    where id = p_assignment_id
      and user_id = current_user_id
      and assigned_date = current_date
  ) then
    raise exception using errcode = '42501',
      message = 'This assignment is not available.';
  end if;

  update public.prime_completions
  set reflection = normalized_reflection
  where prime_assignment_id = p_assignment_id
    and user_id = current_user_id
  returning completed_at into result_completed_at;

  if not found then
    raise exception using errcode = '42501',
      message = 'Complete today''s Prime before saving a reflection.';
  end if;

  return result_completed_at;
end;
$$;

revoke all on function public.save_prime_reflection(bigint, text) from public, anon;
grant execute on function public.save_prime_reflection(bigint, text) to authenticated;

commit;
