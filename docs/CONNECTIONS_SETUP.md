# Diong Connections Setup (Phase A)

This phase adds the database foundation for **Diong Connections**. It creates two
tables, ownership-integrity constraints and owner-only Row Level Security. It does
**not** add RPC functions, routes, UI, `/home` changes, Daily Prime changes, or
any AI or third-party integration. Those arrive in later phases.

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

## Migration To Run

Run `supabase/migrations/202609060001_connections.sql` against the target
Supabase project.

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

When local migration tooling is not configured:

1. Test in a non-production project first and back up any existing data.
2. Open the target project in the Supabase Dashboard, then open **SQL Editor**.
3. Open `supabase/migrations/202609060001_connections.sql` locally and copy the
   complete file.
4. Create a new SQL Editor query, paste the migration, confirm the selected
   project, and run it once.
5. Confirm the transaction completed without an error.
6. Record the filename and application date in the deployment record. Do not
   rerun this migration against a database where it already succeeded.

The migration is wrapped in a single `begin; ... commit;` transaction and is not
idempotent; it will fail cleanly if the tables already exist.

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

Beginning in Phase B, `connection_interactions` rows are created exclusively by a
`record_connection_interaction(...)` `SECURITY DEFINER` RPC. In Phase A there is
no way for a client to write the table at all (no `insert` grant, no `insert`
policy).

The RPC will, in one transaction:

- verify `auth.uid()` and that the target connection belongs to the caller;
- validate `occurred_at`, rejecting or clamping future timestamps;
- insert the interaction row;
- update `connections.last_meaningful_contact_at`.

Application code calls that RPC rather than inserting into
`connection_interactions` directly.

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

## Rollback Considerations

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
