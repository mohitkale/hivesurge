# Review: eng stack 024/025/026/027/029/030 (2026-10-11)

Verdict: each PR's own delta is APPROVED (030 has a design nit). NOTHING MERGED.

Blocking: the real stack is main aee856b → 009 feat/m2-5-levels 22e94b0 → 014 feat/m2-7-ftue c2a3d4e → 015 feat/m2-16-size-budget 24aca65 → 017 feat/m2-13-guardrails b8b61fe → 018 feat/m2-15-perf-overlay 9fde3aa → 024 7c1fc45 → 025 2cf3af8 → 026 3f6ceec → 027 f1108d0 → 029 78fa677 → 030 7e5d68d. 009/014/015/017/018 have never been reviewed. Review those first, or restack 024+ onto main.

Checks: lint passes on all tips. Tests: 121/124/127/129/131/143. Build passes on all tips with the stack's deps (@types/node from 015, puppeteer-core from 024). With the stale shared node_modules it fails TS2688 → run npm ci. Bundle at 030: entry 5.17 kB (2.28 gz), game 61.45 kB (20.59 gz), three 540.94 kB (134.79 gz), dist 599 KiB. Within budget. No secrets.

024: metrics.mjs + bot runner + puppeteer-core devDep. Approved.
025: gate angle integrated per tick; revive spares the Matriarch; FTUE uses gateXAhead. Approved.
026: defeatHeadline (So close! only at ≤ 50% nest left). Approved.
027: reset UNPACK flags on dispose; accessible star label. Approved. Nit: needs a smoke log for 0 warnings.
029: nest 2350 / hive 50, exactly as in the levels-m2.md M2-17 note; casual 65–75% test. Approved.
030: consumed only on grant ✔; 2 early closes then the offer closes ✔; countdown pauses during the ad ✔; free revive on no_fill/error once per session, then "Ad not available" for 3 s ✔; rewarded-shown carried into the post-revive ResultSession, so no interstitial ✔; single payout via tryClaim ✔; caps count impressions only ✔. Nit (DES): the free revive requires adsEverLoadedThisSession with no offline check. The spec denies it only when offline AND no ad has loaded.

Update 2026-10-11: design confirmed 030's code; spec fixed in PR 031 (merged). 024–030 remain approved and are blocked only by 009 (see REVIEW-009-018-eng-base-stack.md).
