# Diong V1 Release Plan

Status of this document: **planning only**. No implementation has been done for
the gaps below. Generated from a full repository audit.

Estimated V1 completion: **~62%**.

---

## 1. Audit summary by V1 area

| # | Area | Status | Note |
| --- | --- | --- | --- |
| 1 | Authentication | **COMPLETE** | login / register / forgot / reset / callback / logout all present; safe redirect validation in callback. Minor a11y: auth error uses `role="status"` not `alert`. |
| 2 | Onboarding / profile creation | **COMPLETE** | 3-stage form, `complete_onboarding` RPC, username validation + reserved words, profile self-repair. |
| 3 | Protected app shell / navigation | **PARTIAL** | Layout + header exist. Header has no links to Goals / Habits / Journal (features absent) and no explicit Home link. |
| 4 | Home dashboard | **NEEDS POLISH** | Works for current scope (Daily Prime card, interests, Connections nudge, Prime history link). Must surface Goals / Habits / Journal once built. |
| 5 | Daily Prime | **COMPLETE** | `get_or_assign_daily_prime` RPC, one-per-day, completion via `complete_daily_prime`. |
| 6 | Prime completion / reflection | **BLOCKED** | Code complete (Phase G, uncommitted). Needs migration `202609100001_prime_reflections.sql` applied. |
| 7 | Prime history + progress | **BLOCKED** | Code complete (Phase G, uncommitted). List/detail/progress work without the migration; reflection markers/text need it. |
| 8 | Connections lifecycle | **COMPLETE** | Dashboard, create, detail, edit, record interaction, deactivate/reactivate, SQL nudge engine, home card. Migrations applied. |
| 9 | Goals | **MISSING** | No table, RLS, migration, route, data layer, server action, UI, nav, or test. |
| 10 | Habits + streaks | **MISSING** | No table, RLS, migration, route, data layer, server action, UI, nav, or test. |
| 11 | Private journal | **MISSING** | No table, RLS, migration, route, data layer, server action, UI, nav, or test. |
| 12 | Profile / settings | **PARTIAL** | `/settings/profile` edits username/display name/bio. No `/settings` index, no in-app password change, no account deletion, no sign-out surface outside header. |
| 13 | Empty / loading / error states | **PARTIAL** | Empty states are good where features exist. **No `loading.tsx`, `error.tsx`, `not-found.tsx` or `global-error.tsx` anywhere.** |
| 14 | Mobile responsiveness | **NEEDS POLISH** | Mobile-first Tailwind throughout; no verified 375px pass; no obvious overflow found. |
| 15 | Accessibility baseline | **PARTIAL** | Forms strong (labels, `aria-invalid`, `aria-describedby`, focus management). Gaps: auth alert role, landing dead `#` links, no skip link. |
| 16 | Supabase / RLS authorization | **COMPLETE (for built features)** | Revoke-first grants, owner-only policies, `SECURITY DEFINER` RPCs, `search_path=''`. No RLS for Goals/Habits/Journal because the tables don't exist. |
| 17 | Tests / lint / build | **PARTIAL** | `npm test` 80 pass, `npm run lint` clean, `npm run build` clean. Tests cover pure lib logic only — none for auth, onboarding, profile validation, data layer, server actions; no e2e. |
| 18 | Production deployment readiness | **PARTIAL** | Env correctly gitignored, no service-role key, publishable key only. Gaps: boilerplate README, no `.env.example`, no deploy doc, unapplied migration, uncommitted Phase G, no `/privacy` `/terms`, no error monitoring, Supabase prod email/redirect config undocumented. |

---

## 2. Blockers (must fix before ship)

1. **Apply migration** `supabase/migrations/202609100001_prime_reflections.sql` to the target Supabase project (exact SQL in `docs/DAILY_PRIME_HISTORY.md`). Until then, saving a Prime reflection errors.
2. **Commit + push Phase G** (Daily Prime history/reflection/progress) — currently uncommitted working-tree changes + untracked files.
3. **Goals, Habits, Journal do not exist.** Three full vertical slices required for the stated V1 scope.
4. **No route-level `error.tsx` / `not-found.tsx` / `loading.tsx`.** An unhandled server error in any page currently renders the Next default error screen.
5. **No `/privacy` and `/terms` pages.** A commercial product collecting email + profile data should ship these; footer links are dead (`href="#"`).

---

## 3. Security review result

**No critical issues found.**

- No service-role key anywhere in the repo. Only `NEXT_PUBLIC_SUPABASE_URL` + publishable (anon) key are used.
- `.env*` is gitignored; no env file is tracked.
- No client-side Supabase writes. `src/lib/supabase/client.ts` exists but is **imported nowhere** (dead code).
- All mutations run through server actions or `SECURITY DEFINER` RPCs with explicit ownership checks + owner-scoped `where` clauses on top of RLS.
- Auth callback validates `next` is a local path before redirecting.
- Cross-user reads collapse to `notFound()` / null (Connections detail, Prime history detail, profile page).

Watch items (not blockers):

- `getAuthenticatedUser` relies on `supabase.auth.getClaims()`. This is the modern local-JWT-verification path and is acceptable; confirm the Supabase project uses asymmetric JWT signing keys in production so verification does not silently fall back to a network call per request.
- Goals/Habits/Journal must ship **with** RLS enabled and owner-only policies from their first migration — the `journal_entries` cross-links (`prime_assignment_id`, `goal_id`, `habit_id`) need same-owner checks.
- Register relies on Supabase email-confirmation settings; verify the production project's confirmation + redirect URLs before launch.

---

## 4. Database work still required

| Item | Detail |
| --- | --- |
| Apply `202609100001_prime_reflections.sql` | Adds `prime_completions.reflection` + `save_prime_reflection()` RPC. Not yet run. |
| `goals` + `goal_updates` migration | Tables, `updated_at` trigger, RLS enable, revoke-first grants, owner-only select/insert/update/delete policies, `status` CHECK, indexes `(user_id, status)`. Mirror `202609060001_connections.sql` structure. |
| `habits` + `habit_logs` migration | Tables, RLS, owner-only policies, `cadence` CHECK, unique `(habit_id, log_date)`, composite FK `(habit_id, user_id)` so a log cannot attach to another user's habit. |
| `journal_entries` migration | Table, RLS, owner-only policies, `body` required CHECK, optional `prime_assignment_id` / `goal_id` / `habit_id` with same-owner integrity (composite FKs). Strictly owner-only — no shared select policy. |
| Streak calculation | Decide SQL vs. pure TS. Reuse the Phase G `calculatePrimeProgress` approach (pure, date-string diffing, `today` injected) rather than a second engine. |
| `types/database.ts` | Add row/insert/update types + any RPC signatures for each new table. |

Do **not** modify any already-applied migration. New migrations only, provided as exact SQL for manual review + apply.

---

## 5. UX / polish work still required

- Add `app/(protected)/loading.tsx` (skeleton) and `app/(protected)/error.tsx` (calm retry) — one pair covers every protected route.
- Add `app/not-found.tsx` (branded 404) and `app/global-error.tsx`.
- Add `/privacy`, `/terms` (and optionally `/about`, `/how-it-works`) pages; wire the footer links.
- Fix auth form error region: `role="alert"` when `state.success` is false.
- Landing: point Hero "Start free" at `/register` (not `#start`); resolve or remove dead footer `#` links.
- Landing copy currently advertises "Supportive community" as a feature — either mark it clearly as "coming later" or remove from the V1 feature grid to match scope.
- Header nav: add Goals / Habits / Journal / Home links as those ship; consider a mobile menu (nav wraps but gets crowded).
- 375px pass on: `/daily-prime`, `/daily-prime/history`, both connections detail views, onboarding stages, progress summary grid.
- De-duplicate the profile fetch: `app/(protected)/layout.tsx` and each page both call `requireCompletedProfile()` (two identical profile queries per request).
- `README.md` is create-next-app boilerplate — replace with real setup + migration order + env + deploy notes. Add `.env.example`.

---

## 6. Testing gaps

- No tests for `src/lib/profile-validation.ts` (username rules, reserved words) — high value, pure, easy.
- No tests for the Phase G data layer or any server action.
- No integration/e2e coverage of the core loop (register → onboard → prime → complete → reflect → history).
- Goals/Habits/Journal will each need: pure validation tests, streak-calc tests (habits), and id-parser tests — same shape as the Connections/Prime test suites.
- Consider one smoke test per protected route that asserts it renders for an authed user and redirects when not (needs a test harness for RSC — may be deferred to a manual checklist for V1).

---

## 7. Deployment gaps

- [ ] Migration `202609100001` applied to production Supabase.
- [ ] Goals/Habits/Journal migrations applied.
- [ ] Phase G committed + pushed; branch clean.
- [ ] Vercel project: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set for Production + Preview.
- [ ] Supabase Auth: production Site URL + redirect allow-list include the Vercel domain (`/auth/callback`).
- [ ] Supabase Auth: email confirmation + SMTP (or Supabase default) configured; reset-password + confirm email templates point at the production domain.
- [ ] Supabase: JWT signing keys on asymmetric (for local `getClaims` verification).
- [ ] `/privacy` + `/terms` published.
- [ ] Error monitoring (Sentry or Vercel) wired, or at least `global-error.tsx` logging.
- [ ] `README.md` + `.env.example` written.
- [ ] Final `npm run lint && npm test && npm run build` green on CI or locally on the release commit.
- [ ] Manual smoke of the full core loop on the deployed URL with a fresh account.

---

## 8. Shortest critical path to production

**Phase H — Ship Phase G (½ day)**
1. Apply `202609100001_prime_reflections.sql`.
2. Manually verify reflection save/edit, history, progress.
3. Commit + push Phase G.

**Phase I — Goals (1–1.5 days)**
4. Migration: `goals` + `goal_updates` (+ RLS, policies, trigger, indexes) — exact SQL for manual apply.
5. `src/lib/goals/` — validation (pure + tests), `goals-data.ts` (owner-scoped reads).
6. `app/(protected)/goals/` — list + `new` + `[id]` + `[id]/edit`; `actions.ts` (`createGoal`, `updateGoal`, `completeGoal`, `archiveGoal`, `deleteGoal`, `addGoalUpdate`) following the Connections `[id]/actions.ts` pattern (bound id, `requireCompletedProfile`, explicit ownership, safe errors, `revalidatePath`).
7. Empty state, header nav link, home surfacing.

**Phase J — Habits + streaks (1–1.5 days)**
8. Migration: `habits` + `habit_logs` (unique `(habit_id, log_date)`, composite FK).
9. `src/lib/habits/` — validation + pure streak calc (reuse Phase G approach) + tests.
10. `app/(protected)/habits/` — list + `new` + `[id]`; `actions.ts` (`createHabit`, `updateHabit`, `logHabit`, `unlogHabit` if essential, `archiveHabit`).
11. Empty state, nav, home surfacing.

**Phase K — Journal (1 day)**
12. Migration: `journal_entries` (strict owner-only, optional same-owner cross-links).
13. `src/lib/journal/` — validation + tests.
14. `app/(protected)/journal/` — list + `new` + `[id]` + `[id]/edit`; `actions.ts` (`createEntry`, `updateEntry`, `deleteEntry`).
15. Empty state, nav, home surfacing.

**Phase L — Global states + legal + a11y (½–1 day)**
16. `app/(protected)/loading.tsx`, `app/(protected)/error.tsx`, `app/not-found.tsx`, `app/global-error.tsx`.
17. `/privacy`, `/terms` pages; wire footer; fix Hero CTA; fix auth alert role; trim/curb landing community claim.
18. 375px pass across all routes; fix any overflow.

**Phase M — Deploy hardening (½ day)**
19. `README.md` + `.env.example`; document migration order.
20. Vercel + Supabase production config (§7 checklist).
21. Error monitoring.
22. Full green `lint` / `test` / `build` on release commit; deployed-URL smoke test.

**Total: ~6–7 focused days.**

---

## 9. Recommended implementation order

`H → I → J → K → L → M` (above). Rationale:

- **H first** — Phase G is already written and reviewed; applying one migration + committing unblocks two V1 areas for near-zero cost and clears the working tree.
- **I, J, K next** — the three missing verticals are the only large build items. Do them back-to-back while the Connections pattern is fresh; each reuses the same file layout, action pattern, RLS structure, and test shape. Order I→J→K is by decreasing complexity (Goals has updates, Habits has streak logic, Journal is simplest) — but any order works; they're independent.
- **L before M** — global error/loading states and legal pages are quick and make every prior phase feel finished; do them once, after the routes that need them exist.
- **M last** — deployment config is only meaningful once the app is feature-complete.

Keep each phase: brief plan → implement → `npm test && npm run lint && npm run build` → report → stop for review. Never modify an applied migration; hand new migrations over as SQL.

---

## 10. Defer until after V1 (confirmed out of scope)

AI Coach · live AI protocol generation · public community feed / posts / likes / comments / follows · direct messaging · Google Contacts · Google Calendar · push notifications · in-app notifications table · native mobile · advanced analytics / charts · gamification / XP / levels / badges / ranks · Stripe / payments · eBooks / planners / downloads / Storage library · interaction deletion (unless a correctness need appears) · admin content-management UI for protocols.

Landing page currently references community + streaks as features — align copy with this list before launch.

---

## 11. Known non-blocking issues / cleanup

- `src/lib/supabase/client.ts` — dead code (no importers).
- `src/components/prime/prime-protocol-card.tsx` — hardcoded sample protocol used only on the landing page; acceptable as a marketing illustration, but confirm that's intended.
- Duplicate `requireCompletedProfile()` call (layout + page).
- `ROUTES.md` lists `/settings`, `/about`, `/how-it-works`, `/privacy`, `/terms`, `/goals`, `/habits`, `/journal`, `/community`, `/notifications` — only some exist; reconcile after V1 build.
- `docs/DATA_MODEL.md` marks goals/habits/journal/social as "proposals" — promote the V1 three to "implemented" when done.
