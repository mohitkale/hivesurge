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

| Migration                           | What                                                                                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261022000100_m4_schema.sql`      | `profiles`, `saves` (jsonb + `revision`), `level_progress`, `player_stats`, `events`, `purchases_sandbox`, `admin_users`; profile trigger            |
| `20261022000200_m4_rls.sql`         | RLS on every table, `private.is_admin()`, grants (no `anon` access, no player deletes)                                                               |
| `20261022000400_m4_sync_player.sql` | `sync_player`: one batched round trip (save + progress/stats + events) and `private.insert_events` (idempotent, insert-only)                         |
| `20261022000300_m4_rpc.sql`         | `push_save` (optimistic concurrency on `revision`) and `sync_progress` (monotonic max-merge), both `security invoker`                                |
| `20261022000500_m5_sync_now.sql`    | `sync_player` also returns `now` (server ms) for the trusted game clock (M5-4c)                                                                      |
| `20261022000600_m5_purchases.sql`   | `purchases_sandbox` gains `session_id` (unique), `payment_intent`, `status`, `amount`, `currency`, `grants`; **client insert/update revoked** (M5-8) |

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

## Account (M4-4)

Settings → **☁️ Account & cloud save** (opt-in; guests never need it):

- **Turn on cloud save (guest)**: anonymous Supabase user; the save syncs right away.
- **Link email** (guest account): `auth.updateUser({ email })` sends a confirm link; after it,
  the same user id (and cloud save) has an email and works on other devices.
- **Email me a link**: magic-link sign-in (creates the account if new). On a second device the
  local progress merges into the account's cloud save (gem ledger union, nothing lost).
- **Sync now / Sign out**: sign-out keeps the local save on the device.

With no env vars the same panel runs on the **mock cloud** (this browser's localStorage, labelled
MOCK CLOUD): "links" sign in at once and nothing is sent.

## Human steps (dashboard only; the MCP has no auth-config tool)

1. Authentication → Sign In / Providers → **Allow anonymous sign-ins: on** (today: off; the
   panel then says "Guest cloud save is not enabled on this backend yet").
2. Authentication → URL Configuration → Site URL `http://localhost:5173`; Redirect URLs
   `http://localhost:5173/**`, `http://127.0.0.1:5173/**`, `http://127.0.0.1:4180/**`.
3. Free-tier email: the built-in mailer only sends to the organisation's team emails and is
   rate-limited, so test magic links with your own (team) address. Other addresses need custom
   SMTP (not set up; no outside contact).

## Try it locally

```sh
# Mock cloud (no Supabase): works with zero env vars
npm run dev            # http://localhost:5173 → ⚙️ → Account & cloud save

# Real sandbox backend
cp .env.example .env.local   # fill in the project URL + publishable/anon key (never commit)
npm run dev
```

Then: ⚙️ → Account & cloud save → "Email me a link" with your Supabase team email (or "Turn on
cloud save (guest)" once anonymous sign-ins are on). Play a battle; within ~10 s the
`saves`, `level_progress`, `player_stats` and `events` rows appear (Table editor). Sign in on a
second browser with the same email to see the merge.

## RLS rules (M4-3)

- Players read and write **only their own rows** (`user_id = auth.uid()`); never delete.
- `events`: players **insert only**; only admins read.
- `purchases_sandbox`: players **read their own rows only** (restore). Since M5-8 only the
  `stripe-webhook` Edge Function (service role) inserts or updates purchases, so a client cannot
  grant itself paid items. `sandbox` must be true; provider is `mock` or `stripe_test`.
- `admin_users`: read-only from the API (a user sees only their own row). Admins
  (`private.is_admin()`, a `security definer` helper in the unexposed `private` schema) can
  read every table but cannot write player rows.
- The logged-out `anon` role has no table or RPC access.

Tests: [`supabase/tests/rls_test.sql`](../../supabase/tests/rls_test.sql) creates users A and B,
runs the abuse cases (B reads/updates/inserts A's rows, self-promotion to admin, deletes,
non-sandbox purchases, anon access, stale save revisions) inside one transaction and rolls
back. It returns `M4/M5 RLS tests: all passed` or raises on the first failure. The repo test
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

## Stripe purchases (M5, TEST MODE only)

**Status (2026-10-22): mocked.** No Stripe keys exist on the build box and the Stripe account
needs Mohit's approval (PLAN M5-6b hard gate), so no account was created. Everything else is
built and deployed; real test-mode Checkout switches on with secrets only (no code change).

### How it works

| Piece                                      | Where                                      | Notes                                                                                                                                                               |
| ------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-checkout` Edge Function (deployed) | `supabase/functions/create-checkout/`      | `verify_jwt = true`. Signed-in player sends `{sku, currency, returnUrl}`; server prices the SKU from its own catalog and returns the hosted Checkout URL.           |
| `stripe-webhook` Edge Function (deployed)  | `supabase/functions/stripe-webhook/`       | `verify_jwt = false`; verifies `Stripe-Signature` (HMAC, 5 min tolerance), grants `checkout.session.completed` (paid), revokes currency on a full `charge.refunded` |
| Shared, unit-tested logic                  | `supabase/functions/_shared/`              | `stripeSig.ts`, `checkout.ts`, `webhook.ts`, `grant.ts` (idempotent save grants, keys `purchase:<session>` / `refund:<session>`), `skus.ts`, `restStore.ts`         |
| Seed script                                | `scripts/stripe-seed-test.mjs`             | Products `hs_<sku>` and Prices with `lookup_key = <sku>_usd` / `<sku>_inr`; idempotent; refuses non-`sk_test_`/`rk_test_` keys                                      |
| Grants                                     | webhook → `purchases_sandbox` + cloud save | Row insert is unique by session id; the save gets gem-ledger / coin-book grants keyed by session id (revision + 1, optimistic). The client never grants paid items. |

Without secrets both functions answer **503 `stripe_not_configured`** (checked live
2026-10-22: webhook 503, checkout without JWT 401, with JWT 503).

### Switch Stripe test mode on (Mohit, about 10 minutes)

1. **Approve the Stripe account in chat** (M5-6b gate), then create or open the Stripe account
   and stay in **Test mode** (toggle top right). Never activate live payments.
2. **Developers → API keys** (test mode): copy the **Secret key** (`sk_test_...`) and the
   **Publishable key** (`pk_test_...`). A restricted key (`rk_test_...`) with write access to
   Checkout Sessions and read access to Prices also works.
3. **Developers → Webhooks → Add endpoint**:
   - URL: `https://yaizrnbfspmzshdzjcjz.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `charge.refunded`
   - Copy the endpoint **Signing secret** (`whsec_...`).
4. **Supabase dashboard → Edge Functions → Secrets** (or `supabase secrets set`) for project
   `yaizrnbfspmzshdzjcjz`:
   - `STRIPE_SECRET_KEY` = `sk_test_...` (anything else is refused)
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...`
   - optional `ALLOWED_ORIGINS` = comma-separated return origins (default
     `http://localhost:5173,http://127.0.0.1:5173`)
5. **Local `.env.local`** (git-ignored, never commit): `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`.
   The build fails if any `*STRIPE*` env var holds a non-test key (`scripts/live-key-guard.mjs`).
6. Optional: `STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-seed-test.mjs` to create the
   Products/Prices in the dashboard (Checkout uses inline server prices if you skip this).
7. Test with cards `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (decline),
   `4000 0025 0000 3155` (3DS), and refund from the dashboard (PLAN M5-6i / M5-9).

To redeploy the functions: `supabase functions deploy create-checkout` and
`supabase functions deploy stripe-webhook --no-verify-jwt` (the CLI bundles `_shared/`; the
MCP deploy was done with an esbuild single-file bundle of the same sources).
