# Backend (M4): Supabase sandbox

Hive Surge's backend is a **sandbox** Supabase project on the **free tier**. It holds auth,
cloud save, level progress, player stats and the analytics drain. Guest play never needs it:
with no env vars the game runs fully offline.

## Project

| Field   | Value                                                    |
| ------- | -------------------------------------------------------- |
| Name    | `hivesurge-sandbox`                                      |
| Ref     | `yaizrnbfspmzshdzjcjz`                                   |
| URL     | `https://yaizrnbfspmzshdzjcjz.supabase.co`               |
| Region  | `ap-south-1`                                             |
| Org     | `PersonalOrg` (plan `free`)                              |
| Created | 2026-10-22 00:20 IST                                     |
| Cost    | `get_cost` = **$0 / month** (free tier), confirmed at $0 |

Cost check log (M4-1, decision 28): `list_organizations` → one org, plan `free`.
`list_projects` → no Hive Surge project (3 unrelated projects, all paused). `get_cost`
(project) → `{"amount": 0, "recurrence": "monthly"}`. Only then was the project created.
No paid add-on, compute upgrade or branch was used. (Supabase branching is a paid feature, so
"apply cleanly on a fresh branch" was checked on this freshly created project instead.)

## Keys

- **Committed:** nothing but placeholders in [`.env.example`](../../.env.example).
- **Local only:** `.env.local` (git-ignored) with `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`. Both are public by design: RLS protects the data.
- **Never in the client or the repo:** the `service_role` / secret key. Nothing in the game
  needs it. Get the public key from the dashboard (Project Settings → API) or the Supabase MCP
  `get_publishable_keys`.

## Schema (`supabase/migrations/`)

| Migration                           | What                                                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `20261022000100_m4_schema.sql`      | `profiles`, `saves` (jsonb + `revision`), `level_progress`, `player_stats`, `events`, `purchases_sandbox`, `admin_users`; profile trigger |
| `20261022000200_m4_rls.sql`         | RLS on every table, `private.is_admin()`, grants (no `anon` access, no player deletes)                                                    |
| `20261022000400_m4_sync_player.sql` | `sync_player`: one batched round trip (save + progress/stats + events) and `private.insert_events` (idempotent, insert-only)              |
| `20261022000300_m4_rpc.sql`         | `push_save` (optimistic concurrency on `revision`) and `sync_progress` (monotonic max-merge), both `security invoker`                     |

Apply with the Supabase CLI (`supabase db push`) or the MCP `apply_migration`, in file order.

On the sandbox project the 0004 file was applied as `m4_sync_player` and then re-applied as
`m4_sync_player_events_helper` (drop + recreate, adding the events helper); the repo file is the
final version, so a fresh project only needs the four files.

## Client (M4-5 / M4-6)

- `src/platform/cloud/types.ts` — the `CloudBackend` adapter (auth + `sync`).
- `src/platform/cloud/supabaseCloud.ts` — Supabase implementation, dynamic import only.
- `src/platform/cloud/mockCloud.ts` — in-memory implementation with the same rules (tests, and
  every build without Supabase env vars).
- `src/platform/cloud/cloudSync.ts` — local-first sync: at most one `sync_player` round trip
  per 10 s; conflicts merge with `mergeSaves` (gem ledger, M4-5a) and retry.

## RLS rules (M4-3)

- Players read and write **only their own rows** (`user_id = auth.uid()`); never delete.
- `events`: players **insert only**; only admins read.
- `purchases_sandbox`: insert requires `sandbox = true`; provider is `mock` or `stripe_test`.
- `admin_users`: read-only from the API (a user sees only their own row). Admins
  (`private.is_admin()`, a `security definer` helper in the unexposed `private` schema) can
  read every table but cannot write player rows.
- The logged-out `anon` role has no table or RPC access.

Tests: [`supabase/tests/rls_test.sql`](../../supabase/tests/rls_test.sql) creates users A and B,
runs the abuse cases (B reads/updates/inserts A's rows, self-promotion to admin, deletes,
non-sandbox purchases, anon access, stale save revisions) inside one transaction and rolls
back. It returns `M4 RLS tests: all passed` or raises on the first failure. The repo test
`tests/supabaseMigrations.test.ts` also checks statically that every table enables RLS.

## Advisors

Run `get_advisors` (security and performance) after each migration. Last run: see
STATUS.md (decisions 47 and 48).

## Live checks (2026-10-22)

API-level checks with two confirmed test users (`e2e-a@hivesurge.test`, `e2e-b@hivesurge.test`,
created by SQL in the sandbox; password kept off the repo):

| Check                                                           | Result               |
| --------------------------------------------------------------- | -------------------- |
| `sync_player` first push / stale push                           | ok / conflict + data |
| Player reads own `saves`, `level_progress`, `player_stats`      | 1 / 1 / 1 rows       |
| Player reads `events`                                           | 0 rows (insert-only) |
| B reads A's saves/progress/stats; sees profiles                 | 0 / 0 / 0; own only  |
| B updates A's save                                              | 0 rows               |
| B inserts an event as A; A deletes own save; B self-admin       | 42501 denied (all)   |
| Logged-out `select saves` / `rpc sync_player`                   | 42501 denied         |
| `private.insert_events` via the API                             | not exposed          |
| Two devices on one account, offline spend vs grant, `CloudSync` | merged to 17 gems    |
