# M2-21a: gem-priced revive

Owner: MON. Inputs:

- `PLAN.md` M2-21a;
- `docs/design/revive-m2.md` (main; design/m2-specs @ 899a34e is identical in substance);
- merged M2-21 code `src/platform/revive.ts` (PR 030);
- `guardrails.md`, `iap-catalog.md`, `economy.md`, `sim/economy_sim.py`.

Test mode only.

## Verdict: **GO with conditions** (conditions C1–C8 below; all checked by G19 / `check_guardrails.py` or tests)

## Recommendation

| Item          | Value                                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Price         | **10 gems, flat. No escalation** within a battle, session or day. That's about $0.42 at the `gems_small` rate (120 gems / $4.99). |
| Per battle    | **1 revive total**, shared across ad, free fallback and gem (`revives === 0` already enforced by `world.revive()`)                |
| Per session   | ≤ 2 gem revives                                                                                                                   |
| Per day       | ≤ 3 gem revives (the ad revive keeps its own 10/day cap in `ad-placements.md`)                                                    |
| Eligibility   | Same as `shouldOfferRevive`: not in FTUE, `revives === 0`, nest damage ≥ 50%. The gem button only appears inside that same offer. |
| Remote config | `revive.gemPrice`, `revive.gemCaps` (session/day); values in `monetization/revive-gem.json`                                       |

## Interaction with the existing ad and free revive (PR 030)

- **One offer, one revive.** The gem option is a third button in the existing offer:
  - "Revive (watch ad)", "Revive (10 💎)" and "No thanks";
  - all the same size and style (G9);
  - no pre-selected button.
- The ad revive stays the main path (G8: watch, pay gems, or earn slowly). The gem button only saves ad-averse players time.
- **Early ad close:** unchanged (≤ 2 closes; the revive is not consumed). The gem button stays available while the offer is open.
- **No fill / error:** the free once-per-session revive (when `adsEverLoadedThisSession`) takes priority. While the "Revive (free)" button is shown, hide the gem button so nobody pays for something they can get free. When the free revive is used up and ads are unavailable, the gem button may remain. That's acceptable: the ad isn't available, and gems are earned currency.
- **Not enough gems:** show the button disabled with the price. **Never** link to the gem store or a purchase from the revive offer (no IAP upsell during a loss).
- **Countdown:** the 10 s countdown pauses while the gem confirm sheet is open, the same as it pauses during an ad. The confirm sheet shows the price and the balance after.
- **Interstitial:** a gem revive counts as a monetised revive on this transition. Treat it like `markRewardedShown` so no interstitial follows (G4 spirit).
- **Analytics:** add `revive_granted{source:'gems', price}`, `gems_spent{sink:'revive'}` and `revive_declined{gemBalance}`.

## Guardrail mapping

| Rule                     | Fit   | How                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1/G2 FTUE               | ✔     | No revive offer at all in the first 3 battles (`rewardedAllowed`)                                                                                                                                                                                                                                                                                                                           |
| G3/G4 interstitial       | ✔     | No interstitial after any revive on that transition                                                                                                                                                                                                                                                                                                                                         |
| G5 caps                  | ✔     | New gem caps 2/session and 3/day; ad caps unchanged                                                                                                                                                                                                                                                                                                                                         |
| G6 noAds                 | n/a   | Gems are earned or bought; buying gems already sets noAds                                                                                                                                                                                                                                                                                                                                   |
| G7 no pay-to-win wall    | ✔     | Revive is never required; the sim's progression is unchanged (revives are not modelled as needed to win), and the loss-streak assist (meta-m5) helps stuck players for free                                                                                                                                                                                                                 |
| G8 three ways            | ✔     | Ad, gems, or retry                                                                                                                                                                                                                                                                                                                                                                          |
| G9 equal buttons         | ✔     | Three equal buttons, no default                                                                                                                                                                                                                                                                                                                                                             |
| G10 grant on completion  | ✔     | Grant only after the gem debit commits                                                                                                                                                                                                                                                                                                                                                      |
| G11 clear prices         | ✔     | The gem price is on the button, the confirm sheet shows the balance after, and the gem store shows real-money prices                                                                                                                                                                                                                                                                        |
| G12/M5-11 no paid random | ✔     | The revive is deterministic                                                                                                                                                                                                                                                                                                                                                                 |
| G13 pop-up offers        | ✔     | The revive offer is not a store pop-up; no gem-store pop-up on defeat                                                                                                                                                                                                                                                                                                                       |
| G14 kids                 | ✔     | Gems only; no real-money prompt in the flow                                                                                                                                                                                                                                                                                                                                                 |
| G18 no interruption      | ✔     | `gameplayStop` during the offer (existing)                                                                                                                                                                                                                                                                                                                                                  |
| **G19 (new)**            | added | Gem revive: flat price, 1 revive per battle total, ≤ 2/session and ≤ 3/day, no offer in FTUE, no buy-gems upsell from the offer, **no gem revive on the final level of a live event** (avoids pay-to-finish-event pressure), countdown pauses on confirm, no default button, price ≤ $0.50 equivalent. Checked by `check_guardrails.py` over `revive-gem.json` plus unit tests T-G19 (ENG). |

## Sim impact (`python3 monetization/sim/economy_sim.py`, seed 42, 200 runs, design 91fed5c, k = 0.5)

New output (ASSUMPTIONS: 50% of losses reach ≥ 50% nest damage; weekly boss and event gem targets are completed. Gems from 3-star daily targets and every-10th-level gems are not counted, so income is conservative):

| Persona    | Free gems / 30 d  | Revive-eligible defeats / 30 d | Gems to gem-revive them all at 10 | Free income covers |
| ---------- | ----------------- | ------------------------------ | --------------------------------- | ------------------ |
| no-ads     | 230 (7.7/day)     | 24 (0.8/day)                   | 240                               | 96%                |
| ad-watcher | 230               | 23                             | 230                               | 100%               |
| payer      | 230 (+ purchases) | 22.5                           | 225                               | 100%               |

At 15 gems, coverage drops to about 65%. That would put pressure on free players to buy gems, so 10 is the ceiling.

- At 10 gems, a free player could gem-revive almost every eligible defeat from earned gems alone. That competes with chest skips (3–35 gems), which is a healthy soft-currency choice, not a pressure to buy.
- The daily cap of 3 is above the typical demand (~0.8/day), so it only binds for unusual sessions and limits loss-chasing.
- No revenue is projected. Real conversion effects need playtest and analytics data.

## Conditions for ENG (GO with conditions)

- **C1:** extend `ReviveOffer` with `takeGems()`. Grant only after an atomic gem debit, and never when `revives > 0` or the offer is closed.
- **C2:** gem caps (2/session, 3/day) in `AdPacer`-style counters; the daily counter is persisted, the session counter is not.
- **C3:** hide the gem button while the `free` button is shown.
- **C4:** no IAP or gem-store link from the offer; when the balance is too low, show the button disabled.
- **C5:** countdown pause on the confirm sheet; equal buttons; no default.
- **C6:** `offer_on_event_final_level = false`. Needs an `isEventFinalLevel` flag from M7-3 and is a no-op until events exist.
- **C7:** tests T-G19a–g mirroring the checks above, plus PR 030's existing revive tests still green.
- **C8:** remote config `revive.gemPrice` / `revive.gemCaps`. Any change goes through `revive-gem.json` and `check_guardrails.py`.

## Design to act on

- Confirm the three-button offer layout in `revive-m2.md` (a design doc update) and the copy for the disabled-gem state.
- Event final-level flag (M7-3/liveops) for C6.
