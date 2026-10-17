# M2 exit recheck: origin/main 5b2e108, 2026-10-17

Tester: Grok Bot (computerUse subagent) for Mohit K. Branch qa/m2-exit-recheck-2026-10-17, worktree /workspace/hivesurge-wt/qa-recheck-17, HEAD 5b2e108 (clean, nothing edited, nothing committed).
Times are UTC on the box (IST = UTC+5:30).
Environment: software WebGL, no GPU. fps numbers are environment-bound (median pins at about 30.0 in every sample). Browser viewport about 1024x594. Phone = 390x844 iframe wrapper (phone.html on 127.0.0.1:8765 and localhost:8765). Dev server: `npx vite --host 127.0.0.1 --port 0`, served at 127.0.0.1:40223 (my own PID, stopped at the end).
Origins used: localhost:40223 (desktop FTUE, then the 15-min session), 127.0.0.1:40223 (2X, gem revive, G6), 127.0.0.1:8765 wrapper with the game iframe (fresh partition for phone FTUE).

## Per-item results

Smoke (1)
- S1 Home on launch, fresh save with FTUE, desktop: PASS. Fresh launch shows the home map ("PLAY · LEVEL 1", Modes, Collection, Daily). FTUE L1 starts from PLAY.
- S2 Home on launch, fresh save with FTUE, phone 390x844: PASS (fresh partition on the 127.0.0.1 wrapper, FTUE L1 win, home).
- S3 Home after a win: PASS. Desktop FTUE win, then Collect, then home ("PLAY · LEVEL 2"). Phone FTUE win, then Collect, then home with "Level 1 cleared!" card. Battle 6 win, then 2X decline, then home.
- S4 Home after a loss and retry: PASS. Loss then Home is a transition. Retry (free) goes through home (home shows "Level N: nest survived" or the PLAY card) and then PLAY (with boost picker at battle 6+). It does not go straight back into battle. This matches decision 44 ("home after every level"; code comment at game.ts:958 says "retries included").
- S5 Closer camera: PASS (code + visual). cameraFraming (gateLabel.ts:46) is fov 42 / height 22k / back 12k landscape, and fov 50 portrait (k = max(0.9, laneLength/40)). The battle screens show the nest filling the top of the frame.
- S6 Nest NEST_SCALE 1.9: PASS (code). gateLabel.ts:30 = 1.9, used in scene.ts for the nest scale. Pixel size not measured.
- S7 Whole-level boost persists: PASS. 2x Cannon boost: chip "BOOST · 2x Cannon · whole level" present at 0 s, 5 s, 44 s and 49 s of battle 6 (04:14 desktop run). Not re-checked at the battle's end. 2x Fire speed and other boosts not run.
- S8 2x Cannon twin barrels: PASS (visual). Two barrels side by side on the cannon in the battle-6 capture (scene.ts barrel-2 twin).
- S9 Screen shake off by default: PASS. Settings shows "Screen shake: off" on a save that never toggled it (save.ts:83 default shake:false).
- S10 Screen shake capped when on: PASS (label + code + unit test). Settings label switched to "Screen shake: low". shake.ts: SHAKE_CAP 0.12 (was 0.6), nestHit kick 0, hiveHit 0.05, end 0.12. tests/round3CameraShake.test.ts passes. Shake amplitude not measured on screen.
- S11 Console errors: PASS. Game console clean (0 errors, 0 warnings) across the desktop smoke and the 16-min phone session. The only errors were two `favicon.ico` 404s from my own wrapper page on 8765 (not the game).

BUG recheck (2)
- BUG-01 meter label contrast: PASS. style.css:94-104 gives `.meter-label` an ink backplate (--hud-plate rgba(42,24,56,.85)) plus outline. The hive number is #8a4f00 (was #b86e00). Ratios in A11Y section.
- BUG-02 L6 hint overlapping trap labels: PASS. The hint is now `bottom: calc(132px + safe-area)` with its own backplate (style.css:298-310), above the Queen button and below the gate rows. No overlap with the "-600 trap" labels in the L6 captures (04:14, 04:34). The hint hides after first fire (hud.ts:79).
- BUG-03 phone home: horizontal scrollbar and off-centre card: PASS (not reproduced). At 390x844 fresh save: scrolled the whole home list to the bottom, no horizontal scrollbar, only the vertical bar. "Level 1 cleared!" card is centred within the column (approximate, visual).
- BUG-04 boost cap doc vs code: PASS. monetization/ad-placements.md row 2 now reads session 6, day 20. adPacer.ts AD_CAPS.placements.boost = { session: 6, day: 20 }. Match.
- BUG-05 "No thanks" skips the interstitial at battle 6+:
  - On 2X: PASS. 127.0.0.1 origin, battle 6 win. Win modal "2X 🪙 194" and "No thanks" (buttons 140x48 and 139x47, same row). No thanks at 04:33:31, then home with no interstitial.
  - On revive (?battle=6, nest held on at 74%): PASS. localhost origin, battle 6. Revive row shown, No thanks at 04:15:40, then Home at 04:15:48, no interstitial.
  - Code: decision 43 via ResultSession.markRewardedDeclined (resultSession.ts). tests/declineNoInterstitial.test.ts passes.

Unfinished items (3)
- G3 retry, gap and transitions: PASS. Phone session on localhost:8765 (interstitials shown at T1, T3, T5 only):
  - 04:18:53 Retry (battle 1, no interstitial yet, so the replay rule is isolated). Home, then PLAY.
  - T1 04:20:45 Home. Interstitial SHOWN (first eligible transition).
  - T2 04:22:52, 127 s after T1. NO interstitial (gap).
  - 04:24:43 Retry, 223 s after T1 (gap satisfied). NO interstitial (replay rule).
  - T3 04:27:02, 381 s after T1. Interstitial SHOWN.
  - T4 04:28:49, 107 s after T3. NO interstitial.
  - T5 04:30:29, 207 s after T3. Interstitial SHOWN.
  - T6 04:32:14, 105 s after T5. NO interstitial.
  Interstitials shown: 3 (within the 4/session cap). Min gap between shown ones: 207 s (≥ 180 s).
- G13 one pop-up offer per session: PASS (vacuous, caveat). Zero IAP pop-up offers appeared across the desktop and phone sessions (8 battles plus desktop runs, about 35 min total). offers.ts says pop-up IAP offers "none exist in the slice yet". Rewarded offers (2X, revive, boost) are exempt by G13's own text. The rule is not exercised in the browser.
- G19 gem revive confirm and spend: PARTIAL. Confirm and spend PASS. Cap (≤2 gem revives per session) NOT exercised.
  - Gems: sandbox "Pouch of Gems" ($4.99 label, mock, no charge). 💎 2 → 122 (grant of 120, gems_small in platform.ts). "no forced ads" appears in Settings after the purchase.
  - Defeat at battle 6 with ?revive=force: rows "Revive (watch ad) · 10", "Revive (💎 5 gems)" (enabled), "No thanks", Retry/Home.
  - Gem button → confirm sheet "Revive for 💎 5 gems · balance 122 → 117" with "Spend 5 gems" and "Back". Spend → battle resumed (timer 45, hive 25) → home shows 💎 117.
  - Second defeat in the same battle: no revive row (one revive per battle, PASS).
  - Price 5 gems ≈ $0.21 at the gems_small rate (≤ $0.50, PASS). No buy-gems link on the revive row (PASS). Confirm sheet has no default button (both btn class, PASS).
  - Not run: the ≤2 gem revives/session cap; the Back path; visual check that the countdown pauses on confirm (code: revive.ts:141 pauses when confirmOpen; the sheet hides the countdown, so not seen on screen).
- M2-10 15-min continuous session: PARTIAL.
  - Done: 04:16:12 to 04:32:17 (16 min), one page life, no reload, 8 battles with defeat, retry and home handling.
  - fps (?debug overlay, mean fps; median and 1% low also shown): 26.0 to 39.6 across about 11 samples, median 29.9-30.0 in every sample, 1% low 12.0-29.9.
  - Units: 16-35 at each sample. Peak 63 draw calls. Not the 500-unit run that PLAN.md defines for M2-10.
  - Memory (Chrome task manager, "Tab: phone wrapper"): about 5.3 min 130,188K; about 9.6 min 126,176K; about 10.5 min 124,124K; about 14.5 min 118,608K; about 15.9 min 117,328K. Falling, no growth. Samples were taken near 5, 10, 14.5 and 16 min (not exactly every 3 min).
  - Verdict: duration and memory-leak check PASS, but the 500-unit criterion is NOT run. Remains open.
- A11Y contrast (A11Y-01, 03, 06, 07): PASS by CSS worst-case analysis. Pixel sampling with PIL BLOCKED (see Evidence). Method: plate colour rgba(42,24,56,.85) composited over pure white, the lightest possible background (worst case). The result bounds any real background, since plate alpha is 0.85.
  - A11Y-01 meter labels (13px/900, normal): plate over white 10.24:1 (target 4.5). Over sampled-sky/honey/plum composites: 11.07 / 12.11 / 15.12 (target 4.5). PASS.
  - A11Y-03 your-hive number, #8a4f00 on #fff, 18px/900 (normal text, not large): 6.56:1 (target 4.5). PASS. (Old #b86e00 was 3.99:1, FAIL.)
  - A11Y-06 FTUE prompt, #fff 24px/900 (large), plate: 10.24:1 (target 3.0). PASS.
  - A11Y-07 level banner "LEVEL n" 48px/900 (large), plate: 10.24:1 (target 3.0). PASS. Subline 16px/800 (normal) also 10.24:1 (target 4.5), PASS.
  - Enemy number #6b2d8c on #fff: 8.83:1 (unchanged, PASS).

Extra checks
- G6 purchase sets noAds (no interstitial): PASS. After the gems_small purchase, a defeat then Home at battle 6+ showed no interstitial (04:46:54, 127.0.0.1 origin). The control (interstitial with no purchase) was T1 above. Settings shows "no forced ads".
- Unit tests: `npx vitest run` 63 files, 453 tests, all pass (run at 04:42, about 3 min).
- SMOKE-11 console (from 10-16 log): closed, see S11.

## Bugs for eng

BUG-07 (Low, cosmetic): on the gem-revive confirm sheet, "Spend 5 gems" renders as a narrow vertical stack of letters. Repro: `?debug&battle=6&revive=force`, buy the sandbox Pouch of Gems, lose a battle, then tap Revive (gems).

OBS-04 (Low, UX): once the gem cap is reached, the gem revive button is hidden with no explanation. Consider showing it disabled with a "limit reached" note.


No new functional defect was confirmed in scope. Observations, all Low:

OBS-01 (Low, UX/design, not a defect as coded). Revive offer countdown is 10 s (revive.ts:19 OFFER_COUNTDOWN_S = 10) and runs while the player reads the defeat screen. The row disappears when it hits 0, leaving Retry/Home only. Repro: `?debug&revive=force` (or a close-call defeat). Idle to the defeat screen and wait more than 10 s, then the revive row is gone. Two of my attempts missed the offer this way. Suggest: start the countdown only after the defeat card has been on screen about 1 s, or lengthen it. Design call.

OBS-02 (Low, balance question). The boost "2x Cannon" doubles nest HP on Level 6 (boostEnemyScale): the nest showed 1,620 HP unboosted and 3,240 HP with the boost. In my run a sweep did not win the boosted L6 battle (hive lost at about 70 s). This may be intended ("boosted battles face a tougher nest"). Ask design to confirm with a human player.

OBS-03 (Info). The pre-level boost picker appears on every PLAY, including PLAY after Retry or Home. Each boost is a Watch-ad choice. This is per design, noted only for review.

Prior BUG-06 (revive-then-win could not be reached in the 10-16 run): now closed. The gem revive resumed the battle, and I saw it in play.

## M2 exit verdict (updated after the follow-up run, 05:08 to 05:23 UTC)

**PASS for the QA scope on the box.** This excludes M2-19b and M2-28b, which are parked for Mohit's device.

- M2-10: 15-minute session at `?debug&stress=500` (600 to 723 units) in one page life. Memory went from 137 MB to 93 MB with no upward trend: PASS. fps stepped down once between 3 and 6 minutes, then stayed flat from 6 to 15 minutes (median 20, 1% low 12), so there is no degradation over time. Absolute fps is environment-bound (software WebGL).
- G19 caps: after 2 gem revives in a session, the gem option is hidden in battle 3. This held in two fresh runs: PASS. Once per battle: PASS. The Back button on the confirm sheet makes no spend and the countdown pauses: PASS. Balance went 120 to 115 to 110.
- G5 session and day caps: covered by unit tests (453/453 pass). No separate browser run.
- G7, G8, G11, G12, G14 to G17 are catalog, legal and build checks. They can't be tested in the browser and are owned outside QA.

Remaining non-QA items: M2-19b (real-device fps and input lag) and M2-28b (real-player aim traces).

## Evidence

Shell cannot read the screenshots this run produced. The Shell view of agent-data/assets is stale (last changed 2026-10-17 02:11). Read can open them. So playtests/img/ has no copies, and /tmp/qa-recheck-17 has no screenshot copies. Paths (box, readable with Read):
- Desktop battle 6 with 2x Cannon boost chip and twin barrels: /home/box/agent-data/agents/00954027-24b6-4462-90ff-3836ad48a6f5/assets/68d34e4028d4579fe3c52e102edf4492429fdb69e686d114288f095aec2a33ba.png
- Desktop FTUE L1 battle: .../assets/4e5b0cb466c97d01a57ef89ac4574d817f07c256a275002cea045a25013fd671.png
- 2X win modal at battle 6 (2X vs No thanks sizes): .../assets/18558cb3ed07003eb1f3490deec3d69f7d4991ca215fb4368d224ead2de46c63.png
- Settings with "Screen shake: low" and "no forced ads": .../assets/96e18c0ff5611e0a34e2214b3b446a8a636c442e413085ea3b3d2ffd50c8bcb1.png
- Phone home after FTUE win ("Level 1 cleared!"): .../assets/e6612bd3959d9cef3894b6c6bf6a47536558bcdf737ed9aaa3ae4cf636d147e4.webp (Computer)
- Phone home bottom (no horizontal scrollbar): .../assets/1cd36ffcf4e0c6429d2c195281f951031830b2f82f2c07f672d8de8fb9e499cf.webp (Computer)
- Chrome task manager, phone wrapper memory at 14.5 min: .../assets/9e9c28b1d318e858499439b9c7799b1c80b4ef561966ef65ac5ac846216a8f41.webp (Computer)
Session notes: /tmp/qa-recheck-17/session-start.txt, vitest.log.

Process notes: the wrapper page had two favicon 404s (not the game). The Chrome task manager window was left open.


## Appendix: M2-10 500-unit and G19 cap run

# Hive Surge M2 exit checks: M2-10 (15-min stress) and G19 (gem-revive caps)

Build: origin/main 5b2e108, worktree /workspace/hivesurge-wt/qa-recheck-17 (no tracked files edited).
Server: `npx vite --host 127.0.0.1 --port 0` (Part A on localhost:39765; Part B on 127.0.0.1:39765 normal window and a second run in an incognito window for fresh storage).
Environment: desktop Chrome 1280x800, software WebGL (no GPU). Absolute fps is environment-bound.

## Part A: M2-10, 15-minute session at 500 units

Setup: `localhost:39765/?debug&stress=500`, one page life, no reload. Session 04:53:37 to 05:08:37 UTC. Tab identified by Task Manager PID 1064686 (Process ID column). Load from `uptime` (1/5/15 min) logged every 30 s to uptime-A.log.
Battles were kept going with Retry (free) and Home, with PLAY/Start on re-entry. Stress was applied on load and carried through every battle re-entry in the same page life. Battles ended several times (losses/Retry), and each re-entry kept the stress units spawning (units 600-720 mid-battle).

| Sample (UTC) | Mark | Overlay fps mean / med / 1% low | Units | Draw calls | Tris | Verts | TM tab memory | uptime (1/5/15) |
|---|---|---|---|---|---|---|---|---|
| 04:57:00 (sampled ~12 s late; 3-min mark 04:56:37) | 3 min | 35.1 / 30.0 / 20.0 | 723 | 56 (peak 56) | 94.2k (peak 105.0k) | 282.5k | 137,216 K (CPU 10.5) | 7.67 7.27 6.02 (04:56:37) |
| 04:59:45 (6-min mark 04:59:37) | 6 min | 21.1 / 20.0 / 15.0 | 628 | 55 (peak 56) | 74.0k (peak 105.0k) | 222.1k | 135,600 K (CPU 4.5) | 7.39 7.56 6.37 (04:59:37) |
| 05:02:37-55 | 9 min | 20.2 / 20.0 / 12.0 | 654 | 55 (peak 56) | 79.3k (peak 105.0k) | 237.8k | 85,436 K (05:02:45); 86,344 K (05:02:55) | 4.87 6.46 6.16 (05:02:42) |
| 05:05:31-40 | 12 min | 22.0 / 20.0 / 12.0 | 670 | 55 (peak 56) | 79.5k (peak 105.0k) | 238.5k | 94,256 K (CPU 4.5) | 6.09 6.49 6.24 (05:05:40) |
| 05:08:37-44 | 15 min | 21.8 / 20.0 / 12.0 | 682 | 55 (peak 56) | 84.1k (peak 105.0k) | 252.3k | 93,152 K (05:08:39); 93,356 K (05:08:44) | 7.73 6.98 6.47 (05:08:44) |

Notes on the samples:
- The overlay reports fps as a rolling readout, so "mean" is the overlay's mean and "1% low" is its 1% low. Each sample was read at the moment of the sample, not averaged over the 3-minute window.
- Units overshoot the 500 target during battles (628-723 seen); the 3-min sample was at level-2 intro with 723 units.
- Memory readings were taken from the Task Manager row for PID 1064686. Readings fluctuated around +/-50 MB between samples (137 -> 136 -> 86 -> 94 -> 93 MB).

Verdict:
- Memory: no growth. 137.2 MB at 3 min -> 93.4 MB at 15 min (about -32%). The threshold of +20% was not reached. There is no upward trend across 6, 9, 12 and 15 min (range 85-94 MB).
- FPS: a step down between the 3-min and 6-min samples (mean 35.1 -> 21.1, median 30 -> 20, 1% low 20 -> 15), then flat from 6 to 15 min (mean 20-22, median 20, 1% low 12). There is no continued degradation after 6 minutes. Caveat: the 3-min sample was at a different phase (level-2 intro, 723 units) than the later battle samples, so the drop may be partly phase rather than time.
- Load: 1-min load stayed in the 4.9-7.7 range across the session, with 5-min around 6-7.6. No runaway load.
- Stress continuity: stress applied on load only (no reload during the session). Battles were re-entered via Retry/Home and stress kept spawning; no reload was needed.

## Part B: G19 gem-revive caps (at most 2 gem revives per session)

Two fresh runs were done, because the first run's Back test was deferred:
- Run 1: normal window, 127.0.0.1:39765 (fresh storage: coins 0, gems 0 at start). Two gem revives plus the third-battle check.
- Run 2: incognito window, 127.0.0.1:39765 (a second fresh origin storage; the earlier localhost:39765 origin held an old save with gems 3, so I did not use it). Back test plus two gem revives plus the third-battle check.

Setup per run: `?debug&battle=6&revive=force`, Shop -> "Pouch of Gems $4.99" (SANDBOX, no money charged) -> Confirm (test) -> gems 0 -> 120.

Run 1 (gem balance trail):
- Battle A: loss. Offer shown: "Revive (watch ad)", "Revive (gems 5)", "No thanks", "Retry (free)", "Home". My gem click landed after the 10-second countdown; the offer row was gone, no spend. Balance 120.
- Battle B1 (first gem revive): loss at ~05:13. Gem click -> sheet "Revive for 5 gems · balance 120 -> 115" -> Spend. Balance 115. After the revive a second loss in the same battle showed NO revive offer (Retry/Home only), so once-per-battle held.
- Battle B2 attempt 1: timing miss, offer expired, no spend. Balance 115.
- Battle B2 attempt 2 (second gem revive): loss ~05:16. Gem click -> sheet "balance 115 -> 110" -> Spend. Balance 110. Session count now 2.
- Battle B3 (third loss): offer shows only "Revive (watch ad) · 9" and "No thanks" plus Retry (free) and Home. The gem option is HIDDEN (not greyed out, no locked/disabled button, no buy-gems prompt). Balance 110.

Run 2 (incognito, fresh storage; Back test here):
- Battle 1: loss at 05:19:57. Offer: "Revive (watch ad) · 10", "Revive (💎 5 gems)", "No thanks", "Retry (free)", "Home". Gem click at 05:20:01 -> sheet "Revive for 💎 5 gems · balance 120 → 115" with "Spend 5 gems" and "Back".
- BACK TEST (pass): Back at 05:20:06 returned to the offer ("Revive (watch ad) · 7", "Revive (💎 5 gems)", "No thanks", Retry, Home). No spend. The next Home read (after gem revive #1) showed 115, which confirms the Back press itself cost nothing (120 before, 115 after the one spend).
- Countdown: the 10-second revive countdown appeared to pause while the confirm sheet was open (7 s left on Back, about 6 s elapsed) and resumed after Back (3 s left a few seconds later). My later gem click came after expiry, so no spend.
- Battle 1 gem revive #1: after a timed-out attempt, the next loss (05:21:09) had the gem Spend executed via script without reading the sheet first; the battle revived. Home showed 💎 115 (120 - 5). Gem session count 1.
- Same battle, second loss (05:21:27): NO revive offer (Retry/Home only). Once per battle held.
- Battle 2: loss at 05:22:21. Gem click -> sheet "Revive for 💎 5 gems · balance 115 → 110" -> Spend (gem revive #2). Balance 110. Session count 2.
- Same battle, second loss (05:22:39): NO revive offer (Retry/Home only).
- Battle 3: loss at 05:23:18. Offer: "Revive (watch ad) · 9" and "No thanks" only; Retry (free) and Home. Gem option HIDDEN (no disabled or greyed gem button, no buy-gems CTA). Home: 💎 110 (no change).

Results:
- Session cap of 2 gem revives: PASS in both runs. Gem revive offer did not appear for battle 3 once the 2-per-session cap was reached (hidden rather than disabled, in both runs).
- Once-per-battle rule: PASS (second loss in a revived battle showed no offer, in both runs).
- Back button on confirm sheet: PASS. Returns to the offer, no spend (balance unchanged).
- Gem balances: 0 -> 120 (Pouch) -> 115 (gem revive #1) -> 110 (gem revive #2). Final 110 in Run 1; final 110 in Run 2.

Observations / issues for QA:
- Revive-offer countdown is 10 s from loss and was tight for tool-driven clicks. Two timing misses (no spend) happened, both recorded as no spend.
- The "Spend 5 gems" button on the confirm sheet renders as a narrow vertical stack of letters (layout/CSS issue, cosmetic).
- Battle-3 offer hides the gem button rather than disabling it, and gives no explanation of why it is missing. Rendering matches the "hidden" option of the check.
- Two runs used different storage: 127.0.0.1 and localhost are separate origins (the localhost save held gems 3 from an earlier session); incognito gave fresh storage.
- Process note: one browser_run_code call was briefly attached to another agent's tab (127.0.0.1:40223/?debug); its PLAY locator timed out before any click, and I then switched to my own tab (127.0.0.1:39765) with browser_tabs select. Nothing was clicked in the other tab.

Overall: M2-10 memory: no >20% growth (PASS). FPS: a one-time drop between 3 and 6 minutes, then flat (not a continuing degradation). G19: caps PASS (gem option hidden at the 3rd battle), Back test PASS.
