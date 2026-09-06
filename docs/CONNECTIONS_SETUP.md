# Diong Connections Setup (Phases A–B)

**Phase A** adds the database foundation for **Diong Connections**: two tables,
ownership-integrity constraints and owner-only Row Level Security.

**Phase B** adds the secure server-side operations: a `SECURITY DEFINER` RPC for
recording an interaction (which also maintains the denormalised last-contact
value atomically) and a deterministic, read-only nudge function.

Neither phase adds routes, UI, `/home` changes, Daily Prime changes, or any AI or
third-party integration. Those arrive in later phases.

## Purpose Of Diong Connections

Diong Connections helps a user intentionally maintain the people who matter to
their life, growth, goals and support system. It is not dating, matchmaking,
romantic-relationship software or relationship therapy.

A connection can be a friend, family member, mentor, accountability partner,
colleague, professional contact, collaborator, study partner, community member,
coach or adviser, or another important person.

The feature is designed to help a user answer:

- Who matters to my growth?
- Why does this connection matter?
- When did we last meaningfully connect?
- Is this connection due for attention?
- What small action could I take?

All connection data is private to its authenticated owner. There are no public
connection profiles and no automatic sharing.

## Migrations To Run

Apply in order against the target Supabase project:

1. `supabase/migrations/202609060001_connections.sql` (Phase A — tables + RLS)
2. `supabase/migrations/202609060002_connection_rpcs.sql` (Phase B — RPCs)

Migration 2 depends on migration 1 and on the shared `public.set_updated_at()`
function from `202607190001_onboarding_and_profiles.sql`.

If the Supabase CLI is linked and configured:

```bash
supabase db push
```

The web app needs only the existing public environment variables. No
service-role key is used.

```text
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

### Apply With Supabase SQL Editor

When local migration tooling is not configured, apply each migration file the
same way, in order:

1. Test in a non-production project first and back up any existing data.
2. Open the target project in the Supabase Dashboard, then open **SQL Editor**.
3. Open the migration file locally and copy the complete file.
4. Create a new SQL Editor query, paste the migration, confirm the selected
   project, and run it once.
5. Confirm the transaction completed without an error.
6. Record the filename and application date in the deployment record. Do not
   rerun a migration against a database where it already succeeded.

Each migration is wrapped in a single `begin; ... commit;` transaction and is not
idempotent. Migration 1 fails cleanly if the tables already exist; migration 2
fails cleanly if the functions already exist (`create function`, not
`create or replace`).

## Schema

### `connections`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | Primary key. |
| `user_id` | `uuid` | `references auth.users(id) on delete cascade`. Owner. Not client-writable. |
| `name` | `text` | Required. 1–120 characters after trimming. |
| `connection_type` | `text` | Required. Controlled vocabulary (see below). |
| `connection_purpose` | `text` | Required. Single purpose in V1. Controlled vocabulary. |
| `why_it_matters` | `text` | Optional. Max 500 characters. |
| `preferred_contact_days` | `integer` | Optional. Between 1 and 365 when present. `null` means no rhythm is tracked. |
| `last_meaningful_contact_at` | `timestamptz` | System-managed. `null` means never contacted. Denormalised from interaction history. Not client-writable in any phase; maintained only by the Phase B `record_connection_interaction()` RPC. |
| `notes` | `text` | Optional, private. Max 2000 characters. |
| `is_active` | `boolean` | Defaults to `true`. Inactive connections are excluded from future nudges. |
| `created_at` | `timestamptz` | Defaults to `now()`. Not client-writable. |
| `updated_at` | `timestamptz` | Defaults to `now()`. Maintained by the shared `public.set_updated_at()` trigger. Not client-writable. |

Additional constraint: `unique (id, user_id)` exists to serve as the target of
the composite foreign key from `connection_interactions`.

### `connection_interactions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | Primary key. |
| `user_id` | `uuid` | `references auth.users(id) on delete cascade`. Owner. |
| `connection_id` | `bigint` | Part of the composite foreign key `(connection_id, user_id) -> connections(id, user_id)`. |
| `interaction_type` | `text` | Required. Controlled vocabulary (see below). |
| `occurred_at` | `timestamptz` | Defaults to `now()`. When the interaction happened. |
| `notes` | `text` | Optional, private. Max 2000 characters. |
| `created_at` | `timestamptz` | Defaults to `now()`. |

There is no `updated_at` column because interactions are append-only in V1.

## Controlled Vocabularies

Enforced by `CHECK` constraints and mirrored as string-literal unions in
`src/types/database.ts`.

**`connection_type`:** `friend`, `family`, `mentor`, `accountability_partner`,
`colleague`, `professional_contact`, `collaborator`, `study_partner`,
`community`, `coach_adviser`, `other`.

**`connection_purpose`:** `career_growth`, `accountability`, `learning`,
`friendship`, `family`, `collaboration`, `networking`, `support`, `shared_goal`,
`community`, `personal_growth`, `other`.

**`interaction_type`:** `message`, `call`, `video`, `in_person`, `email`,
`other`.

## Ownership Model

- Every row references `auth.users(id)` through `user_id` with
  `on delete cascade`.
- `connections` has column-scoped `INSERT` and `UPDATE` grants. A client sets
  `user_id` only at creation and can never change it afterwards, so ownership
  cannot be reassigned. `id`, `created_at` and `updated_at` are never
  client-writable; they are owned by column defaults and the
  `public.set_updated_at()` trigger.
- `last_meaningful_contact_at` is system-managed. It is excluded from both the
  `INSERT` and `UPDATE` grants, so application code cannot set or change the
  denormalised last-contact value directly. From Phase B it is maintained only
  inside the `record_connection_interaction()` `SECURITY DEFINER` RPC, in the
  same transaction as the interaction insert.
- `connection_interactions` has a composite foreign key
  `(connection_id, user_id) -> connections(id, user_id)`. This makes it
  structurally impossible to attach an interaction to a connection owned by a
  different user, independently of RLS.
- If a `connections` row is deleted, its interactions are removed by the
  composite foreign key's `on delete cascade`.

## Row Level Security

RLS is enabled on both tables. The migration uses a revoke-first model: all
privileges are revoked from `anon` and `authenticated`, then specific privileges
are granted back.

### Grants

| Table | `anon` | `authenticated` |
| --- | --- | --- |
| `connections` | none | `select`, `delete`; column-scoped `insert` on `user_id`, `name`, `connection_type`, `connection_purpose`, `why_it_matters`, `preferred_contact_days`, `notes`, `is_active`; column-scoped `update` on `name`, `connection_type`, `connection_purpose`, `why_it_matters`, `preferred_contact_days`, `notes`, `is_active` |
| `connection_interactions` | none | `select` only — no direct `insert`, `update` or `delete` |

`id`, `created_at`, `updated_at` and `last_meaningful_contact_at` appear in
neither the `insert` nor the `update` grant on `connections`.

### Policies

All policies target the `authenticated` role only.

| Table | Command | Policy name | Rule |
| --- | --- | --- | --- |
| `connections` | `select` | Users can read their own connections | `auth.uid() = user_id` |
| `connections` | `insert` | Users can create their own connections | `with check (auth.uid() = user_id)` |
| `connections` | `update` | Users can update their own connections | `using` and `with check` both `auth.uid() = user_id` |
| `connections` | `delete` | Users can delete their own connections | `auth.uid() = user_id` |
| `connection_interactions` | `select` | Users can read their own connection interactions | `auth.uid() = user_id` |

`connection_interactions` has **only** a `select` policy in Phase A. There is no
`insert`, `update` or `delete` policy. There is no `select` policy that exposes
either table to other users. Connections have no public surface.

## Interaction Creation Is RPC-Only

`connection_interactions` rows are created exclusively by the
`public.record_connection_interaction(...)` `SECURITY DEFINER` RPC (Phase B).
There is no direct `insert` grant or policy on the table, so a client cannot
write it any other way.

## Interaction Append-Only Decision

`connection_interactions` is append-only in V1:

- Owners may `select` their own interactions.
- No `update` or `delete` privilege is granted, and no `update` or `delete`
  policy exists.
- Rows are never mutated after insert.

Reason: `connections.last_meaningful_contact_at` is a denormalised value derived
from interaction history. Allowing a direct insert, update or delete without
recomputing that value in the same transaction could leave the connection's
"last meaningful contact" inconsistent with its history. Routing all writes
through the Phase B RPC keeps the denormalised value and the interaction log in
step. A future controlled correction/delete RPC can remove an interaction and
safely recompute `last_meaningful_contact_at`.

## Phase B: Server-Side Operations

### `public.record_connection_interaction(...)`

```text
record_connection_interaction(
  p_connection_id    bigint,
  p_interaction_type text,
  p_occurred_at      timestamptz default now(),
  p_notes            text        default null
) returns table (
  interaction_id             bigint,
  connection_id              bigint,
  occurred_at                timestamptz,
  last_meaningful_contact_at timestamptz
)
```

- `language plpgsql`, `security definer`, `set search_path = ''`, all identifiers
  schema-qualified.
- Execution: `revoke all ... from public, anon;` then
  `grant execute ... to authenticated;`
- The caller never supplies `user_id`; the function uses `auth.uid()`.

Steps, all in one transaction:

1. Require an authenticated user (`auth.uid()` not null, else `42501`).
2. Validate `p_interaction_type` against the controlled vocabulary (else
   `22023`).
3. Trim `p_notes` to `null` if blank; reject if longer than 2000 chars
   (`22023`).
4. Resolve `occurred_at`: `coalesce(p_occurred_at, now())`. Reject if more than
   five minutes in the future (`22023`); otherwise clamp to `now()` so a stored
   `occurred_at` is never in the future.
5. Confirm a `connections` row exists with `id = p_connection_id` **and**
   `user_id = auth.uid()` (else `42501`). This is the only place the connection
   is resolved, so an interaction cannot be attached to another user's
   connection.
6. Insert the interaction with `user_id = auth.uid()`.
7. Update the parent connection:
   `last_meaningful_contact_at = greatest(coalesce(existing, occurred_at), occurred_at)`.
8. Return one row: the new interaction id, the connection id, the effective
   `occurred_at`, and the resulting `last_meaningful_contact_at`.

**Atomic last-contact behaviour.** The `greatest(...)` expression only ever moves
`last_meaningful_contact_at` forward. Recording an interaction that occurred
before the current value leaves the value unchanged (the interaction is still
stored — the log is complete, the denormalised pointer just does not regress).
The insert and the update happen in the same function call, so the interaction
log and the pointer can never drift apart. The update also fires the
`connections_set_updated_at` trigger, so `updated_at` advances whenever an
interaction is recorded, including for a back-dated one.

Recording an interaction against an **inactive** connection is allowed (the
ownership check is the security boundary; a user may legitimately log a
reconnection). It does not automatically set `is_active = true`.

### `public.get_connection_nudges()`

```text
get_connection_nudges() returns table (
  connection_id              bigint,
  name                       text,
  connection_type            text,
  connection_purpose         text,
  last_meaningful_contact_at  timestamptz,
  preferred_contact_days      integer,
  days_since                 integer,   -- null when never contacted
  status                     text       -- due | approaching | up_to_date | never_contacted
)
```

- `language plpgsql`, `security definer`, `stable`, `set search_path = ''`.
- Execution: `revoke all ... from public, anon;` then
  `grant execute ... to authenticated;`
- Requires an authenticated user (`42501` otherwise).
- Returns **only** rows where `user_id = auth.uid()` and `is_active` is true.
  Inactive connections are never returned.
- Deterministic. No randomness, no AI, no persisted nudge table.

**`days_since`** = whole UTC calendar days between the connection's
`last_meaningful_contact_at` and today, clamped at 0. `null` when the connection
has never been contacted. The clamp means a future-dated last-contact value (a
clock anomaly) yields `0`, never a negative number.

**Status**, evaluated in this order:

| Status | Condition |
| --- | --- |
| `never_contacted` | `last_meaningful_contact_at is null` and (no rhythm set, or fewer than `preferred_contact_days` days since the connection was created) |
| `due` | never contacted **and** at least `preferred_contact_days` days since creation; **or** `days_since >= preferred_contact_days` (exactly at the rhythm counts as due) |
| `approaching` | `days_since >= preferred_contact_days - window` (see window formula below) |
| `up_to_date` | `preferred_contact_days is null` (informational only, never nagged); or none of the above |

The `approaching` window is:

```text
window = least(
  14,
  greatest(2, ceil(preferred_contact_days * 0.2)),
  greatest(0, preferred_contact_days - 1)
)
```

Approximately 20% of the rhythm, at least 2 days, **hard-capped at 14 days**, and
never the whole rhythm (so a connection just contacted is never immediately
`approaching`). Worked examples:

| rhythm (days) | approaching window (days) | notified when |
| --- | --- | --- |
| 1 | 0 | never `approaching` — `up_to_date` straight to `due` |
| 7 | 2 | in the last 2 days before due |
| 30 | 6 | in the last 6 days before due |
| 90 | 14 | in the last 14 days before due (cap) |
| 365 | 14 | in the last 14 days before due (cap) |

Rows are ordered `due`, then `never_contacted`, then `approaching`, then
`up_to_date`; within a status, longest overdue first, then oldest connection
first.

### UTC / server-date limitation

Both the `days_since` calculation and the "days since creation" check use
`(now() at time zone 'UTC')::date`, so results are independent of the database
session time zone. They are **not** aware of the user's local time zone. A user
several hours from UTC may see a connection change from `approaching` to `due` up
to a day before or after their own local midnight. Adding a per-user time zone
would resolve this for Connections and for the Daily Prime engine together; it is
out of scope for V1.

## Phase C: Application / Domain Layer

Phase C adds the typed, framework-free application layer under
`src/lib/connections/`. No routes or UI yet.

| File | Responsibility |
| --- | --- |
| `connection-vocab.ts` | Runtime mirrors of the `src/types/database.ts` vocabulary unions (`CONNECTION_TYPES`, `CONNECTION_PURPOSES`, `INTERACTION_TYPES`) plus `isConnectionType` / `isConnectionPurpose` / `isInteractionType` guards. The `Record<Union, true>` annotations make the compiler reject the file if a union member is missing, so `database.ts` stays the source of truth. |
| `connection-validation.ts` | Pure normalisation + field-level validation for connection create/update input and interaction input. Produces `ConnectionErrors` / `InteractionErrors` maps for forms. Also `connectionColumns()` (input → DB column object) and `interactionRpcArgs()` (input → RPC argument object). |
| `connection-labels.ts` | Display copy: type / purpose / interaction / nudge-status label maps and `suggestedConnectionAction()`. Pure and deterministic. |
| `connections-data.ts` | Typed reads: `listConnections`, `getConnection`, `getConnectionNudges`, `getTopConnectionNudge`. Each takes `SupabaseClient<Database>`. |
| `record-interaction.ts` | `recordConnectionInteraction()` — the only application entry point for creating an interaction. Calls the `record_connection_interaction` RPC and returns a small `RecordInteractionResult`. |

Key rules this layer keeps:

- **The database and the RPC remain authoritative.** `connection-validation.ts`
  is a usability layer only; every limit it checks is also enforced by a CHECK
  constraint or the RPC.
- **`last_meaningful_contact_at` stays system-managed.** No function in this
  layer writes it; `connectionColumns()` does not include it.
- **Interactions stay RPC-only.** `record-interaction.ts` calls the RPC;
  nothing inserts into `connection_interactions` directly. The table
  Insert/Update types in `database.ts` remain `Record<string, never>`.
- **The nudge algorithm is not reimplemented in TypeScript.**
  `getConnectionNudges` is a thin wrapper over `get_connection_nudges()`, and
  `getTopConnectionNudge` relies on that function's documented row ordering.
- **Defence in depth.** `listConnections` / `getConnection` pass an explicit
  `userId` and filter on it in addition to RLS, matching
  `src/lib/profile-data.ts`.

### Test command

```bash
npm test          # vitest run — pure logic only (validation + labels)
```

Vitest (dev dependency) is configured by `vitest.config.ts` (`node`
environment, `src/**/*.test.ts`). Tests cover `connection-validation.ts` and
`connection-labels.ts` only. The SQL nudge algorithm is not unit-tested in
TypeScript; `get_connection_nudges()` remains authoritative and is exercised by
the Phase B verification SQL.

## Verification SQL

Run in the Supabase SQL Editor after applying the migration.

### Tables exist

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('connections', 'connection_interactions')
order by table_name;
```

Expect two rows.

### RLS is enabled

```sql
select relname, relrowsecurity
from pg_class
where oid in (
  'public.connections'::regclass,
  'public.connection_interactions'::regclass
)
order by relname;
```

Both `relrowsecurity` values must be `true`.

### Policies are operation-specific and owner-only

```sql
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('connections', 'connection_interactions')
order by tablename, cmd, policyname;
```

Expect four policies on `connections` (`select`, `insert`, `update`, `delete`)
and exactly one on `connection_interactions` (`select`). Every rule must
reference `auth.uid() = user_id`. There must be no policy granting access to
another user's rows, and no `insert`/`update`/`delete` policy on
`connection_interactions`.

### Grants match the revoke-first model

```sql
select table_name, privilege_type, grantee
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('connections', 'connection_interactions')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

Expect no rows for `anon`. For `authenticated`: `connections` has `SELECT`,
`INSERT`, `UPDATE`, `DELETE` (the `INSERT` and `UPDATE` are column-scoped — see
next query); `connection_interactions` has `SELECT` only.

### Column-scoped INSERT and UPDATE grants on connections

```sql
select column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'connections'
  and grantee = 'authenticated'
  and privilege_type in ('INSERT', 'UPDATE')
order by privilege_type, column_name;
```

Expect for `INSERT`: `connection_purpose`, `connection_type`, `is_active`,
`name`, `notes`, `preferred_contact_days`, `user_id`, `why_it_matters`.

Expect for `UPDATE`: `connection_purpose`, `connection_type`, `is_active`,
`name`, `notes`, `preferred_contact_days`, `why_it_matters`.

`id`, `created_at`, `updated_at` and `last_meaningful_contact_at` must not appear
for either privilege. `user_id` must appear for `INSERT` only, never for
`UPDATE`.

### Composite foreign key exists

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.connection_interactions'::regclass
  and contype = 'f';
```

Expect `connection_interactions_connection_fk` defined as
`FOREIGN KEY (connection_id, user_id) REFERENCES connections(id, user_id) ON DELETE CASCADE`.

### Updated-at trigger is attached

```sql
select tgname
from pg_trigger
where tgrelid = 'public.connections'::regclass
  and not tgisinternal;
```

Expect `connections_set_updated_at`.

### Two-user isolation check

Using Supabase clients authenticated separately as users A and B, with a
connection created by A. (Interactions cannot be created by any client in
Phase A; seed a test interaction row directly in the SQL Editor as the table
owner if you want to verify interaction isolation now.)

1. B cannot `select`, `update` or `delete` A's connection.
2. Neither A nor B can `insert` into `connection_interactions` directly
   (no grant, no policy) — the write is rejected before RLS is evaluated.
3. B cannot `select` A's interactions (seeded rows).
4. A cannot set `user_id` or `last_meaningful_contact_at` on `update`
   (not in the column-scoped grant).
5. A cannot set `id`, `last_meaningful_contact_at`, `created_at` or
   `updated_at` on `insert` (not in the column-scoped grant).
6. Deleting A's connection removes A's seeded interactions for that connection.

## Phase B Verification SQL

### Functions exist with the expected security settings

```sql
select
  p.proname,
  p.prosecdef        as security_definer,
  p.provolatile      as volatility,      -- 'v' volatile, 's' stable
  p.proconfig        as config,          -- expect {search_path=""}
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('record_connection_interaction', 'get_connection_nudges')
order by p.proname;
```

Expect `security_definer = true` and `config = {search_path=""}` for both.
`record_connection_interaction` is `v` (volatile); `get_connection_nudges` is
`s` (stable).

### Execution privileges

```sql
select
  p.proname,
  coalesce(has_function_privilege('authenticated', p.oid, 'execute'), false) as authenticated_exec,
  coalesce(has_function_privilege('anon', p.oid, 'execute'), false)          as anon_exec,
  coalesce(has_function_privilege('public', p.oid, 'execute'), false)        as public_exec
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('record_connection_interaction', 'get_connection_nudges');
```

Expect `authenticated_exec = true`, `anon_exec = false`, `public_exec = false`
for both.

### Nudge status smoke test

As an authenticated user with several active connections in different states:

```sql
select connection_id, name, preferred_contact_days, days_since, status
from public.get_connection_nudges();
```

Check: a connection contacted exactly `preferred_contact_days` ago is `due`; one
with `preferred_contact_days` null is `up_to_date`; a brand-new connection with
no contact is `never_contacted`; an inactive connection does not appear at all;
`days_since` is never negative.

## Phase B Manual Two-User Authorization Checks

Using Supabase clients authenticated separately as users A and B.

1. **A records an interaction** on A's own connection via
   `select * from public.record_connection_interaction(<A_conn_id>, 'message')`.
   The row is created; `last_meaningful_contact_at` on that connection updates.
2. **B cannot target A's connection.** B calling
   `record_connection_interaction(<A_conn_id>, 'message')` raises
   `This connection is not available.` (SQLSTATE `42501`). No row is written to
   `connection_interactions`, and A's connection is unchanged.
3. **Back-dated interaction does not regress the pointer.** A records an
   interaction with `p_occurred_at` set to a date earlier than the current
   `last_meaningful_contact_at`. The interaction row is stored, but
   `last_meaningful_contact_at` is unchanged.
4. **Future timestamp is rejected.** A calls the RPC with `p_occurred_at` set a
   day ahead. It raises `Interaction time cannot be in the future.` (`22023`).
   A timestamp a minute ahead is accepted and stored as `now()`.
5. **Invalid interaction type is rejected.** `p_interaction_type => 'lunch'`
   raises `Interaction type is invalid.` (`22023`).
6. **Null rhythm is never nagged.** A connection with `preferred_contact_days`
   null never appears with status `due` or `approaching` in
   `get_connection_nudges()`.
7. **Inactive connections are excluded.** Setting `is_active = false` on a
   connection removes it from `get_connection_nudges()` output immediately.
8. **B sees only B's nudges.** `get_connection_nudges()` run as B never returns
   any of A's connections.
9. **Anon cannot execute.** An unauthenticated client calling either function is
   rejected (no execute privilege / `Authentication is required.`).

## Rollback Considerations

To roll back Phase B only:

```sql
begin;
drop function if exists public.get_connection_nudges();
drop function if exists public.record_connection_interaction(bigint, text, timestamptz, text);
commit;
```

Removing these functions does not touch any data. Any application code calling
`supabase.rpc(...)` for them must be reverted first.

To roll back Phase A as well (destructive):

Rollback is manual because dropping these tables deletes connection and
interaction data. Back up first. In dependency order:

```sql
begin;
drop table if exists public.connection_interactions;
drop table if exists public.connections;
commit;
```

Dropping `connections` also drops its policies, the `unique (id, user_id)`
constraint and the `connections_set_updated_at` trigger. The shared
`public.set_updated_at()` function is used by other tables and must not be
dropped. Never drop `auth.users`.

After real users have created connections, a forward corrective migration is
safer than a rollback.
