# Admin panel spec (M6-1), sandbox only

Separate `/admin` Vite entry, Supabase auth, gated by `admin_users`. Never ships in player bundle. Works only against the sandbox project; panel shows a red "SANDBOX" banner and refuses to load if the project URL lacks `sandbox`.

## Roles

| Role                                                                                                                                                              | Read players/saves | Reset save        | Grant test currency                        | Purchase log | Remote config             | Manage admins |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------- | ------------------------------------------ | ------------ | ------------------------- | ------------- |
| viewer                                                                                                                                                            | yes (PII masked)   | no                | no                                         | read         | read                      | no            |
| support                                                                                                                                                           | yes                | yes (with reason) | yes, cap 10,000 coins / 500 gems per grant | read         | read                      | no            |
| liveops                                                                                                                                                           | yes                | no                | no                                         | read         | edit + publish            | no            |
| owner                                                                                                                                                             | yes                | yes               | yes, no cap                                | read         | edit + publish + rollback | yes           |
| Every write inserts an `admin_audit` row: `{admin_id, action, target_user, before, after, reason, at}`. Reason text required (min 5 chars) for resets and grants. |

## Screens

### 1. Login

Email magic link. After login, check `admin_users.role`; non-admin sees 403 page.

### 2. Player lookup

Search by user id, email (exact), or display name prefix. Results table: id, created, last seen, level, coins, gems, purchases count, flags. Row click opens Player detail.

### 3. Player detail / save inspect

- Tabs: Summary, Save JSON (read-only tree + raw), Level progress, Events (last 200), Purchases, Audit.
- Actions: Reset save (to default, keep id; confirm dialog type "RESET"), Grant currency (coins/gems/chest type, amount, reason), Restore save revision (pick from last 10 revisions).
- Revision conflicts: action uses optimistic `revision`; if save changed, show diff and retry.

### 4. Stats dashboard

Date range picker (default 7 days), platform filter.

| Widget          | Source                      | Metric                                                |
| --------------- | --------------------------- | ----------------------------------------------------- |
| Level funnel    | events level_start/win/fail | starts, win %, fails per level 1 to 30                |
| FTUE funnel     | ftue_step                   | completion per step, median ms                        |
| Retention       | profiles + events           | D1, D7 cohorts                                        |
| Ad pacing       | ad events                   | interstitials per session, rewarded per DAU, cap hits |
| Economy         | events                      | coins earned vs spent per DAU, chest opens by type    |
| Sandbox revenue | purchases_sandbox           | test transactions per SKU (labelled TEST)             |

### 5. Purchase log

Table from `purchases_sandbox`: time, user, SKU, provider (stripe_test / rc_sandbox), amount (test), status (paid/refunded/cancelled), webhook verified yes/no. Filters by status and SKU. Read-only for all roles.

### 6. Remote config

- Keys: `difficulty` (per-band multipliers from levels-m2), `adPacing` (interstitial gap, ad-free battles, rewarded caps), `events` (calendar from liveops-m7), `chestOdds` (read-only display, change needs owner).
- Editor: JSON with schema validation (zod), diff vs live, "Publish" creates new version; game reads latest on next session start. Rollback to any of last 20 versions.
- Guard: publish blocked if validation fails or odds do not sum to 100.

## Non-goals

No production data, no real refunds, no player messaging in v1.
