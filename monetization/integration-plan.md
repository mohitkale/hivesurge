# M5-6 — Sandbox integration plan (test mode only)

## Recommendation: **Stripe Checkout (test mode) directly**, RevenueCat Web Billing deferred
Rationale: Hive Surge is web-only, the v1 catalog is mostly one-time/consumable SKUs, and PLAN already routes entitlement through a Supabase edge-function webhook (M5-8) with a `purchases_sandbox` table. Stripe Checkout gives a hosted, PCI-handled page, test cards (4242…), `sk_test_`/`pk_test_` keys that are trivially lint-checked (M5-7 live-key guard), INR + local payment methods, and webhooks with signature verification — with one vendor and no extra fee. RevenueCat Web Billing runs on top of Stripe anyway; its main value (cross-platform entitlements across iOS/Android/web, subscription analytics, paywall experiments) applies only once there are app-store builds or subscriptions (VIP/season pass), and it adds a second dashboard, a second key type and a revenue-share fee above its free tier (check current RevenueCat pricing page before adopting). Revisit RevenueCat if/when mobile apps or recurring subscriptions ship; keep SKU ids stable so migration is a mapping exercise.

## Ads SDK sandbox modes
| Target | SDK | Test mode |
| --- | --- | --- |
| Own site | Google H5 Games Ads (Ad Placement API `adBreak`) | `data-adbreak-test="on"` on the adsbygoogle script; requires approved AdSense account (by application) — do NOT apply without Mohit's OK |
| Own site fallback | AppLixir rewarded | sandbox/dev key only if Mohit approves an account |
| Poki | PokiSDK | local dev: SDK debug mode (`PokiSDK.setDebug(true)`), Poki Inspector; no IAP |
| CrazyGames | CrazyGames SDK v3 | local `?useLocalSdk=true` / demo mode returns fake ads; IAP via Xsolla invite-only — skip |
| All | existing `mockPlatform.ts` | default for tests/CI |

## Tasks for hivesurge-ba (to add to PLAN.md)
| ID | Owner | Task | Acceptance | Deps |
| --- | --- | --- | --- | --- |
| M5-6a | MON | Freeze SKU list from iap-catalog.md as `monetization/skus.json` (id, type, usd, inr, grants, random:false) | JSON validated by unit test; matches CATALOG | M5-2 |
| M5-6b | ENG | Stripe **test-mode** account setup — needs Mohit to create/approve account (no live activation) | only `pk_test_`/`sk_test_` in `.env.local`; never committed | Mohit OK |
| M5-6c | ENG | Script `scripts/stripe-seed-test.ts` creating Products/Prices (USD + INR) from skus.json with `lookup_key = sku id`; refuses non-`sk_test_` key | idempotent; test asserts refusal on live key | M5-6a,b |
| M5-6d | ENG | Extend Platform: `purchase(sku)` → `ownSitePlatform` opens Stripe Checkout (test); `CATALOG.price` → `{usd, inr}` | mock still default; G6 any purchase ⇒ noAds | M5-6c |
| M5-6e | ENG | Supabase edge fn `stripe-webhook` (test secret `whsec_`), handles `checkout.session.completed`, `charge.refunded` → `purchases_sandbox` | signature test; client cannot insert (RLS) | M5-8 |
| M5-6f | ENG | Live-key guard in build (`sk_live`/`pk_live`/RC prod) | build fails test | M5-7 |
| M5-6g | ENG | `AdPacer` with per-placement/session/day caps from ad-placements.md via remote config; extend adPolicy tests | G1–G5 tests green | M5-5 |
| M5-6h | ENG | Adapters for H5 Games Ads (test flag), Poki (debug), CrazyGames (local SDK) behind build flag | per-adapter G10/G18 tests | M7-4 |
| M5-6i | QA | Purchase matrix with Stripe test cards (4242 success, 0002 decline, 3DS 3155, refund) | M5-9 cases pass | M5-6e |
| M5-6j | MON | (Optional, later) RevenueCat Web Billing spike in sandbox if mobile builds are planned | written go/no-go | — |

Blocked on Mohit: creating any Stripe/AdSense/AppLixir/RevenueCat account (even test mode needs an account) — no accounts were created.
