# Playtests

Every milestone gets a browser playtest before its PRs merge. Log each run as
`playtests/<milestone>-<YYYY-MM-DD>.md` with tester, device/browser, results and screenshots
(saved in `playtests/screenshots/<milestone>/`).

## Per-milestone checklist

Mark each item pass / fail / n/a (not built yet) with notes.

1. **Load**: first battle playable within ~3 s; no console errors.
2. **Complete levels**: win every shipped level at least once (desktop mouse, keyboard, and touch / mobile emulation).
3. **Fail**: lose a level on purpose (timer and hive destroyed); defeat screen shows nest % remaining.
4. **Revive / retry**: free retry works; rewarded revive (where offered) restores play exactly once.
5. **Each rewarded ad placement**: mock ad shows, pauses + mutes game, grants only on completion, grants nothing on dismiss/error.
6. **2X reward**: post-win doubler doubles coins once; "No thanks" button is equal size and style.
7. **Boosts**: pre-battle boosts apply and expire correctly (not offered on active gameplay screen).
8. **Chests**: timers, ad skip (one ad per chest), contents/odds shown.
9. **Mock purchases**: each sandbox SKU grants exactly its contents; any purchase disables interstitials.
10. **Interstitials**: only at level transitions, at most one per 3 minutes, never chained with a rewarded offer.
11. **Feel**: gate pops, counters, shake, audio, haptics; crowd reads clearly at 300+ units.
12. **Difficulty**: typical player wins with ~10–30% margin; never requires an ad to progress.
13. **Performance**: stable frame rate over a 15-minute session at 300+ units; bundle size noted.
14. **Screenshots**: win screen, loss screen, peak swarm, each modal.
