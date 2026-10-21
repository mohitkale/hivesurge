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

| Migration                      | What                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `20261022000100_m4_schema.sql` | `profiles`, `saves` (jsonb + `revision`), `level_progress`, `player_stats`, `events`, `purchases_sandbox`, `admin_users`; profile trigger |
| `20261022000200_m4_rls.sql`    | RLS on every table, `private.is_admin()`, grants (no `anon` access, no player deletes)                                                    |
| `20261022000300_m4_rpc.sql`    | `push_save` (optimistic concurrency on `revision`) and `sync_progress` (monotonic max-merge), both `security invoker`                     |

Apply with the Supabase CLI (`supabase db push`) or the MCP `apply_migration`, in file order.

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
STATUS.md (decision 47).
