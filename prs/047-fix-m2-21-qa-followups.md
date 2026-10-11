# PR 047: fix/m2-21-qa-followups

M2-21 QA follow-ups (QA screenshots in /tmp/qa-pr030/). Base: main `9b969f9`.

## 1. Debug-only URL params (dev builds only)

Parsed only when `import.meta.env.DEV` is set. Production builds use `NO_DEBUG`, and the parser is tree-shaken out (checked: no `revive`/`force` parsing in `dist/`). Players can't change levels, ads or the economy this way.

| param           | effect                                                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `?level=<id>`   | Start on this level (for example `?level=dandelion-drift`). Unknown ids are ignored.                                                   |
| `?revive=force` | Show the revive offer on every loss. Skips the 50% nest-damage threshold, FTUE (G2) and the caps. One revive per battle still applies. |

They combine with the existing `?debug` (perf overlay) and `?ads=` mock modes. Code: `src/debug/debugParams.ts`.

## 2. Dandelion Drift defeat at ~27 s left, nest 59–70%: not changed, flagged

- Rule: `World.step` ends the battle as lost when `hiveHp <= 0`. Wasps that reach the cannon/hive line deal damage, and Dandelion has hiveHp 50. This is intended: levels-m2.md, "Idle loses rule: total enemy hp reaching the hive > hiveHp within timeLimit".
- Revive needs at least 50% nest damage (revive-m2.md line 11, "current rule"). A loss with the nest at 59–70% health is only 30–41% damage, so there is no offer. Both rules work as written.
- Flag for design: on hive-break defeats the threshold blocks the offer for every loss with less than 50% nest damage. Casual bot, 200 seeds on main: Dandelion only 2 losses (both hive breaks, avg 27.1 s left). Thistle 91/177 losses are hive breaks. Wasp-queen (pre-M2-26 values) only 7/200 losses are revive-eligible. No design rule changed here.

## 3. Early closes: matches revive-m2.md, no code change

revive-m2.md allows "at most **2** early closes per offer" and `adEnabled = closes < 2`. Close 1 returns to the offer. Close 2 is the limit: until M2-21c adds gems, there is no valid option left, so the offer closes. That's 2 early closes, not 2 returns. Changing `>=` to `>` would allow a third ad, which is against the spec. Added a test that pins this. M2-21c then keeps the offer open after close 2 when gems are valid.

## 4. Interstitial on Retry: fixed

G3 says interstitials only at level transitions. Retry replays the same level, so it isn't a transition. Added `isLevelTransition(replay)` (adPolicy). `claim()` shows an interstitial only on Home / next level. Test included.

## 5. Retry/PLAY needing two clicks: reproduced and fixed

- Repro (`playtests/m2-21-qa/clicks.mjs`): press Retry just before the 10 s revive countdown ends and release just after. The defeat screen was rebuilt, and the row removal shifted Retry, so the click was lost. Before: "NOT started after 1 click". After: "started on 1 click".
- Fix: when the offer closes (timeout, No thanks, ad limit), its row is hidden in place (visibility hidden, buttons disabled), so Retry/Home don't move or get rebuilt.
- Plain single clicks on PLAY/Retry worked every time (3/3).
- The interstitial on Retry (item 4) also looked like a second click was needed, because the ad had to be dismissed first.

## 6. AudioContext "not allowed to start" (sfx.ts:47): fixed

On first launch the FTUE battle starts without a gesture. `unlock()` now checks `navigator.userActivation.hasBeenActive`. Before any gesture it arms a one-time capture listener (pointerdown, keydown or touchend) that creates or resumes the context. `playtests/m2-21-qa/audio-warning.mjs` with a fresh profile: main had 3 warnings (sfx.ts:47, :89 x2), this branch has 0.

## Checks

lint ok · tests 221/221 · build ok · size budget: initial JS 2.26 KiB gzip, dist ~902 KiB.
