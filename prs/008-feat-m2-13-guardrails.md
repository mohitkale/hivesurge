# PR 008 — feat/m2-13-guardrails (M2-13; base: feat/m2-16-size-budget, PR 007)

**Summary:** Adds tests and fixes for monetisation guardrails G1, G2, G5, G6, G13 and G17
(`monetization/guardrails.md`). Sandbox only; no real ads, payments or keys.

**Changes**

- **G1** `adPolicy.ts`: `AD_FREE_BATTLES` 2 → 5. `canShowInterstitial` also requires the new save flag `ftueDone`.
- **G2** `adPolicy.ts`: `canOfferRewarded` returns false until `ftueDone` and 3 battles. The game hides the 2X button
  (showing a single "Collect") and the revive button during the FTUE.
- **G5** `adPacer.ts`: `AdPacer` with an injected clock enforces these caps:
  - interstitials: 4 per session, 15 per day;
  - rewarded: 12 per session, 30 per day;
  - per placement: `win_double` 6/20, `revive` 3/10.
    Daily counters persist in `save.adDay` and reset on a new local day. All are wired into `game.ts`.
- **G6** `entitlements.ts`: `applyPurchase` sets `noAds` for every SKU. `CATALOG.gems_small` now lists
  `noAds: true`. The shop uses `applyPurchase`.
- **G13** `offers.ts`:
  - `canShowPopupOffer`: at most 1 pop-up per session, none on an FTUE defeat screen.
  - `isAllowedOfferTimer`: no countdown timers under 24 h.
  - The slice has no pop-up offers yet, so these are rules plus tests only.
- **G17** `scripts/live-key-guard.mjs`:
  - Fails on `sk_live_`, `pk_live_` or `rk_live_` keys, and on RevenueCat `rcb_` keys that lack the `rcb_sb_` sandbox
    prefix.
  - Scans `src/`, `dist/`, `index.html` and `.env*`.
  - Runs before and after `vite build` in `npm run build`.
- `save.ts`: adds `ftueDone` and `adDay` (parsed defensively; `ftueDone` is sticky in `mergeSaves`).
  `game.ts` sets `ftueDone` on the first win, or on a later launch after any battle (until M2-7 owns it).
- `tests/guardrails.test.ts`: T-G1, T-G2, T-G5, T-G6, T-G13, T-G17 (21 tests). Two existing policy test fixtures gain
  `ftueDone: true`.

**Test results:**

- `npm run lint`: pass.
- `npm test`: 85/85 (11 files).
- T-G6 against the old `platform.ts`: 1 failed (`gems_small`), as the criterion requires.
- `npm run build`: pass, live-key guard clean. Entry 5.17 kB (2.28 kB gzip), game 43.88 kB (15.26 kB gzip), three
  537.84 kB (134.09 kB gzip). Budget: initial 2.25 KiB gzip / 1.99 KiB Brotli, dist 578.26 KiB.

**Acceptance (PLAN M2-13):** T-G1, T-G2, T-G5, T-G6, T-G13 and T-G17 exist and pass in `npm test`; T-G6 fails before
the fix. Met.

**Playtest notes:** Not browser-tested; M2-14 (QA) covers this. Behaviour change: a fresh save now sees no 2X or
revive offers for its first 3 battles, and no interstitials before 5 battles.

**Reviewer:** hivesurge-review

**Status:** awaiting review + playtest
