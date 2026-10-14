# M5-2a last run — design 101047a (M5-1b refit)

## seed 42 (200 runs)

```
design_ref=101047a seed=42 runs=200 battles/day=6 base_win=0.7 win_sens=1.3 power_k=0.5 scale=clamp(1+0.01(P-expP),0.95,1.0) lossAssist=[[2, 0.95], [3, 0.9]] floor=0.85 xp/tier=270

Target: expectedP(n) from meta-m5.md (= 100% of free ad-watcher by design). Ratio = median P / expectedP(n).

| Day | no-ads n | no-ads P/expP | no-ads enemy scale | ads n | ads P/expP | payer n | payer P/expP |
|---|---|---|---|---|---|---|---|
| 1 | 5 | 54% | 0.97 | 5 | 67% | 5 | 67% |
| 2 | 8 | 78% | 0.97 | 9 | 89% | 9 | 103% |
| 3 | 12 | 80% | 0.96 | 13 | 96% | 13 | 107% |
| 5 | 21 | 86% | 0.96 | 22 | 98% | 23 | 103% |
| 7 | 30 | 92% | 0.97 | 31 | 100% | 32 | 104% |
| 10 | 43 | 89% | 0.95 | 45 | 101% | 45 | 103% |
| 14 | 61 | 94% | 0.97 | 64 | 99% | 65 | 103% |
| 21 | 94 | 92% | 0.95 | 96 | 101% | 97 | 104% |
| 30 | 135 | 93% | 0.95 | 139 | 101% | 140 | 108% |

f2p_no_ads P/expectedP over days 3-30: min 80%, median 92%
Longest f2p_no_ads level stall (days with no level gained): 0 -> HARD WALL: no

Season pass (payer_pass, day 30): median tier 31; premium cards 48 of 1555 total cards -> premium share 3.1% (design cap 15%)
Premium Epic share of season Epics (payer_pass, day 30): 12.1%; cards/day 51.8
f2p_no_ads: median P/expP days 3-30 92% (min 80%, max 94%); median enemy scale 0.95 (max 0.97); days scale>1.0: 0
f2p_ads: median P/expP days 3-30 99% (min 96%, max 102%); median enemy scale 0.99 (max 1.00); days scale>1.0: 0
payer_pass: median P/expP days 3-30 103% (min 98%, max 108%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
f2p_no_ads: day-30 median Epic level (mean of 3 Epics, unowned=0) 5.00, best Epic 5, season tier 30
f2p_ads: day-30 median Epic level (mean of 3 Epics, unowned=0) 5.33, best Epic 6, season tier 30
payer_pass: day-30 median Epic level (mean of 3 Epics, unowned=0) 5.67, best Epic 6, season tier 31
Epic-level gap payer - no-ads (day 30): +0.67 -> tier-18-to-gems trigger (>1): no

Gem revive (M2-21a, price 5 gems, 1 revive/battle): free gem income vs revive-eligible defeats over 30 days
f2p_no_ads: free gems earned 335 (11.2/day); revive-eligible defeats 43 (1.43/day); gems to gem-revive all 215; free income covers 100%
f2p_ads: free gems earned 335 (11.2/day); revive-eligible defeats 40 (1.33/day); gems to gem-revive all 200; free income covers 100%
payer_pass: free gems earned 330 (11.0/day); revive-eligible defeats 38 (1.27/day); gems to gem-revive all 190; free income covers 100%

Account level (median) day 7 / day 30: f2p_no_ads 8 / 22, f2p_ads 9 / 22, payer_pass 9 / 23

Pity Legendaries per 30 days (median): f2p_no_ads 0, f2p_ads 1, payer_pass 1
f2p_no_ads: day-30 rooms {'pollen_lab': 4.0, 'honey_store': 5.0, 'wax_walls': 5.0, 'brood_cell': 5.0}, account level 22
f2p_ads: day-30 rooms {'pollen_lab': 4.0, 'honey_store': 6.0, 'wax_walls': 5.0, 'brood_cell': 5.0}, account level 22
payer_pass: day-30 rooms {'pollen_lab': 4.0, 'honey_store': 6.0, 'wax_walls': 5.0, 'brood_cell': 5.0}, account level 23

Suggested expectedP refit (median f2p_ads P at first day reaching stage n) vs current:
| Stage n | current expectedP | refit (ads median P) | ratio |
|---|---|---|---|
| 3 | 5 | 5 | 100% |
| 5 | 7 | 7 | 100% |
| 10 | 18 | 18.5 | 103% |
| 14 | 24 | 24 | 100% |
| 25 | 34 | 34 | 100% |
| 36 | 42 | 42 | 100% |
| 52 | 46 | 46 | 100% |
| 74 | 54 | 52 | 96% |
| 111 | 61 | 61 | 100% |
| 160 | 71 | not reached by median run | |
Day-30 level n: no-ads 135, ads 139, payer 140
```

## seed 7 (200 runs)

```
design_ref=101047a seed=7 runs=200 battles/day=6 base_win=0.7 win_sens=1.3 power_k=0.5 scale=clamp(1+0.01(P-expP),0.95,1.0) lossAssist=[[2, 0.95], [3, 0.9]] floor=0.85 xp/tier=270

Target: expectedP(n) from meta-m5.md (= 100% of free ad-watcher by design). Ratio = median P / expectedP(n).

| Day | no-ads n | no-ads P/expP | no-ads enemy scale | ads n | ads P/expP | payer n | payer P/expP |
|---|---|---|---|---|---|---|---|
| 1 | 4 | 54% | 0.97 | 5 | 67% | 5 | 67% |
| 2 | 8 | 76% | 0.97 | 9 | 88% | 9 | 103% |
| 3 | 12 | 81% | 0.96 | 13 | 96% | 13 | 107% |
| 5 | 21 | 86% | 0.96 | 22 | 98% | 23 | 103% |
| 7 | 30 | 93% | 0.97 | 31 | 100% | 32 | 104% |
| 10 | 43 | 89% | 0.95 | 45 | 101% | 46 | 102% |
| 14 | 61 | 95% | 0.97 | 64 | 99% | 65 | 102% |
| 21 | 94 | 92% | 0.95 | 96 | 102% | 97 | 104% |
| 30 | 135 | 93% | 0.96 | 139 | 101% | 140 | 108% |

f2p_no_ads P/expectedP over days 3-30: min 81%, median 91%
Longest f2p_no_ads level stall (days with no level gained): 0 -> HARD WALL: no

Season pass (payer_pass, day 30): median tier 31; premium cards 48 of 1551 total cards -> premium share 3.1% (design cap 15%)
Premium Epic share of season Epics (payer_pass, day 30): 12.3%; cards/day 51.7
f2p_no_ads: median P/expP days 3-30 91% (min 81%, max 95%); median enemy scale 0.95 (max 0.97); days scale>1.0: 0
f2p_ads: median P/expP days 3-30 99% (min 96%, max 102%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
payer_pass: median P/expP days 3-30 102% (min 98%, max 108%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
f2p_no_ads: day-30 median Epic level (mean of 3 Epics, unowned=0) 5.00, best Epic 5, season tier 30
f2p_ads: day-30 median Epic level (mean of 3 Epics, unowned=0) 5.33, best Epic 6, season tier 30
payer_pass: day-30 median Epic level (mean of 3 Epics, unowned=0) 5.67, best Epic 6, season tier 31
Epic-level gap payer - no-ads (day 30): +0.67 -> tier-18-to-gems trigger (>1): no

Gem revive (M2-21a, price 5 gems, 1 revive/battle): free gem income vs revive-eligible defeats over 30 days
f2p_no_ads: free gems earned 335 (11.2/day); revive-eligible defeats 43 (1.43/day); gems to gem-revive all 215; free income covers 100%
f2p_ads: free gems earned 335 (11.2/day); revive-eligible defeats 40 (1.33/day); gems to gem-revive all 200; free income covers 100%
payer_pass: free gems earned 330 (11.0/day); revive-eligible defeats 38 (1.27/day); gems to gem-revive all 190; free income covers 100%

Account level (median) day 7 / day 30: f2p_no_ads 8 / 22, f2p_ads 9 / 22, payer_pass 9 / 23

Pity Legendaries per 30 days (median): f2p_no_ads 0, f2p_ads 1, payer_pass 1
f2p_no_ads: day-30 rooms {'pollen_lab': 4.0, 'honey_store': 5.0, 'wax_walls': 5.0, 'brood_cell': 5.0}, account level 22
f2p_ads: day-30 rooms {'pollen_lab': 4.0, 'honey_store': 6.0, 'wax_walls': 5.0, 'brood_cell': 5.0}, account level 22
payer_pass: day-30 rooms {'pollen_lab': 4.0, 'honey_store': 6.0, 'wax_walls': 5.0, 'brood_cell': 5.0}, account level 23

Suggested expectedP refit (median f2p_ads P at first day reaching stage n) vs current:
| Stage n | current expectedP | refit (ads median P) | ratio |
|---|---|---|---|
| 3 | 5 | 4 | 80% |
| 5 | 7 | 7 | 100% |
| 10 | 18 | 18 | 100% |
| 14 | 24 | 24 | 100% |
| 25 | 34 | 34 | 100% |
| 36 | 42 | 42 | 100% |
| 52 | 46 | 46 | 100% |
| 74 | 54 | 52 | 96% |
| 111 | 61 | 61 | 100% |
| 160 | 71 | not reached by median run | |
Day-30 level n: no-ads 135, ads 139, payer 140
```

## seed 1000 (200 runs)

```
design_ref=101047a seed=1000 runs=200 battles/day=6 base_win=0.7 win_sens=1.3 power_k=0.5 scale=clamp(1+0.01(P-expP),0.95,1.0) lossAssist=[[2, 0.95], [3, 0.9]] floor=0.85 xp/tier=270

Target: expectedP(n) from meta-m5.md (= 100% of free ad-watcher by design). Ratio = median P / expectedP(n).

| Day | no-ads n | no-ads P/expP | no-ads enemy scale | ads n | ads P/expP | payer n | payer P/expP |
|---|---|---|---|---|---|---|---|
| 1 | 5 | 57% | 0.97 | 5 | 67% | 5 | 67% |
| 2 | 8 | 78% | 0.97 | 9 | 89% | 9 | 101% |
| 3 | 12 | 80% | 0.95 | 13 | 96% | 14 | 107% |
| 5 | 21 | 83% | 0.95 | 22 | 98% | 23 | 103% |
| 7 | 30 | 92% | 0.97 | 31 | 100% | 33 | 103% |
| 10 | 43 | 88% | 0.95 | 45 | 100% | 46 | 101% |
| 14 | 62 | 92% | 0.96 | 64 | 100% | 65 | 101% |
| 21 | 94 | 91% | 0.95 | 96 | 101% | 98 | 104% |
| 30 | 135 | 93% | 0.95 | 138 | 101% | 141 | 107% |

f2p_no_ads P/expectedP over days 3-30: min 80%, median 90%
Longest f2p_no_ads level stall (days with no level gained): 0 -> HARD WALL: no

Season pass (payer_pass, day 30): median tier 31; premium cards 48 of 1559.5 total cards -> premium share 3.1% (design cap 15%)
Premium Epic share of season Epics (payer_pass, day 30): 12.3%; cards/day 52.0
f2p_no_ads: median P/expP days 3-30 90% (min 80%, max 93%); median enemy scale 0.95 (max 0.97); days scale>1.0: 0
f2p_ads: median P/expP days 3-30 99% (min 95%, max 102%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
payer_pass: median P/expP days 3-30 102% (min 99%, max 107%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
f2p_no_ads: day-30 median Epic level (mean of 3 Epics, unowned=0) 5.00, best Epic 5, season tier 30
f2p_ads: day-30 median Epic level (mean of 3 Epics, unowned=0) 5.33, best Epic 6, season tier 31
payer_pass: day-30 median Epic level (mean of 3 Epics, unowned=0) 6.00, best Epic 6, season tier 31
Epic-level gap payer - no-ads (day 30): +1.00 -> tier-18-to-gems trigger (>1): no

Gem revive (M2-21a, price 5 gems, 1 revive/battle): free gem income vs revive-eligible defeats over 30 days
f2p_no_ads: free gems earned 335 (11.2/day); revive-eligible defeats 43 (1.43/day); gems to gem-revive all 215; free income covers 100%
f2p_ads: free gems earned 335 (11.2/day); revive-eligible defeats 39 (1.30/day); gems to gem-revive all 195; free income covers 100%
payer_pass: free gems earned 330 (11.0/day); revive-eligible defeats 37 (1.23/day); gems to gem-revive all 185; free income covers 100%

Account level (median) day 7 / day 30: f2p_no_ads 8 / 22, f2p_ads 9 / 23, payer_pass 9 / 23

Pity Legendaries per 30 days (median): f2p_no_ads 0, f2p_ads 1, payer_pass 1
f2p_no_ads: day-30 rooms {'pollen_lab': 4.0, 'honey_store': 5.0, 'wax_walls': 5.0, 'brood_cell': 5.0}, account level 22
f2p_ads: day-30 rooms {'pollen_lab': 4.0, 'honey_store': 6.0, 'wax_walls': 5.0, 'brood_cell': 5.0}, account level 23
payer_pass: day-30 rooms {'pollen_lab': 4.0, 'honey_store': 6.0, 'wax_walls': 5.0, 'brood_cell': 5.0}, account level 23

Suggested expectedP refit (median f2p_ads P at first day reaching stage n) vs current:
| Stage n | current expectedP | refit (ads median P) | ratio |
|---|---|---|---|
| 3 | 5 | 5 | 100% |
| 5 | 7 | 7 | 100% |
| 10 | 18 | 18 | 100% |
| 14 | 24 | 24 | 100% |
| 25 | 34 | 34 | 100% |
| 36 | 42 | 42 | 100% |
| 52 | 46 | 46 | 100% |
| 74 | 54 | 51 | 94% |
| 111 | 61 | 61 | 100% |
| 160 | 71 | not reached by median run | |
Day-30 level n: no-ads 135, ads 138, payer 141
```

## seed 42, --weekly-gems 0 (revive coverage)

```
f2p_no_ads: free gems earned 195 (6.5/day); revive-eligible defeats 43 (1.43/day); gems to gem-revive all 215; free income covers 91%
f2p_ads: free gems earned 195 (6.5/day); revive-eligible defeats 40 (1.33/day); gems to gem-revive all 200; free income covers 98%
payer_pass: free gems earned 190 (6.3/day); revive-eligible defeats 38 (1.27/day); gems to gem-revive all 190; free income covers 100%
```
