# M5-2a last run — design 126a7bc (M5-1 validation fixes)

```
design_ref=126a7bc seed=42 runs=200 battles/day=6 base_win=0.7 win_sens=1.3 power_k=0.5 scale=clamp(1+0.01(P-expP),0.95,1.0) lossAssist=[[2, 0.95], [3, 0.9]] floor=0.85 xp/tier=270

Target: expectedP(n) from meta-m5.md (= 100% of free ad-watcher by design). Ratio = median P / expectedP(n).

| Day | no-ads n | no-ads P/expP | no-ads enemy scale | ads n | ads P/expP | payer n | payer P/expP |
|---|---|---|---|---|---|---|---|
| 1 | 5 | 80% | 0.99 | 5 | 100% | 5 | 100% |
| 2 | 9 | 105% | 1.00 | 9 | 121% | 10 | 138% |
| 3 | 13 | 95% | 0.99 | 14 | 111% | 15 | 119% |
| 5 | 21 | 97% | 0.99 | 23 | 111% | 23 | 116% |
| 7 | 29.5 | 103% | 1.00 | 31 | 110% | 32 | 112% |
| 10 | 42 | 95% | 0.98 | 44 | 104% | 45 | 105% |
| 14 | 59 | 96% | 0.98 | 60 | 102% | 61 | 104% |
| 21 | 88 | 92% | 0.95 | 90 | 100% | 90 | 104% |
| 30 | 125 | 94% | 0.96 | 126 | 100% | 128 | 106% |

f2p_no_ads P/expectedP over days 3-30: min 89%, median 94%
Longest f2p_no_ads level stall (days with no level gained): 0 -> HARD WALL: no

Season pass (payer_pass, day 30): median tier 30; premium cards 48 of 1455 total cards -> premium share 3.3% (design cap 15%)
Premium Epic share of season Epics (payer_pass, day 30): 13.0%; cards/day 48.5
f2p_no_ads: median P/expP days 3-30 94% (min 89%, max 103%); median enemy scale 0.96 (max 1.00); days scale>1.0: 0
f2p_ads: median P/expP days 3-30 100% (min 97%, max 111%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
payer_pass: median P/expP days 3-30 103% (min 100%, max 119%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
f2p_no_ads: day-30 median Epic level (mean of 3 Epics, unowned=0) 5.00, best Epic 5, season tier 29
f2p_ads: day-30 median Epic level (mean of 3 Epics, unowned=0) 5.33, best Epic 6, season tier 30
payer_pass: day-30 median Epic level (mean of 3 Epics, unowned=0) 5.67, best Epic 6, season tier 30
Epic-level gap payer - no-ads (day 30): +0.67 -> tier-18-to-gems trigger (>1): no

Gem revive (M2-21a, price 5 gems, 1 revive/battle): free gem income vs revive-eligible defeats over 30 days
f2p_no_ads: free gems earned 280 (9.3/day); revive-eligible defeats 53 (1.77/day); gems to gem-revive all 265; free income covers 100%
f2p_ads: free gems earned 285 (9.5/day); revive-eligible defeats 51 (1.70/day); gems to gem-revive all 255; free income covers 100%
payer_pass: free gems earned 285 (9.5/day); revive-eligible defeats 49 (1.63/day); gems to gem-revive all 245; free income covers 100%

Pity Legendaries per 30 days (median): f2p_no_ads 0, f2p_ads 1, payer_pass 1
f2p_no_ads: day-30 rooms {'pollen_lab': 4.0, 'honey_store': 5.0, 'wax_walls': 5.0, 'brood_cell': 5.0}, account level 13
f2p_ads: day-30 rooms {'pollen_lab': 4.0, 'honey_store': 6.0, 'wax_walls': 5.0, 'brood_cell': 5.0}, account level 13
payer_pass: day-30 rooms {'pollen_lab': 4.0, 'honey_store': 6.0, 'wax_walls': 5.0, 'brood_cell': 5.0}, account level 13

Suggested expectedP refit (median f2p_ads P at first day reaching stage n) vs current:
| Stage n | current expectedP | refit (ads median P) | ratio |
|---|---|---|---|
| 3 | 2 | 5 | 250% |
| 5 | 5 | 7 | 140% |
| 10 | 13 | 18 | 138% |
| 14 | 21 | 24 | 114% |
| 25 | 30 | 34 | 113% |
| 36 | 39 | 42 | 108% |
| 52 | 46 | 46 | 100% |
| 74 | 54 | 54 | 100% |
| 111 | 63 | 61 | 97% |
| 160 | 71 | not reached by median run | |
Day-30 level n: no-ads 125, ads 126, payer 128
```

## Variants (100 runs)

```
[--no-rooms --no-boss-gold --boss-win-delta 0]
f2p_no_ads: median P/expP days 3-30 80% (min 77%, max 89%); median enemy scale 0.95 (max 0.97); days scale>1.0: 0
f2p_ads: median P/expP days 3-30 86% (min 82%, max 95%); median enemy scale 0.95 (max 0.99); days scale>1.0: 0
payer_pass: median P/expP days 3-30 91% (min 87%, max 105%); median enemy scale 0.95 (max 1.00); days scale>1.0: 0
f2p_no_ads: free gems earned 285 (9.5/day); revive-eligible defeats 54 (1.80/day); gems to gem-revive all 270; free income covers 100%
f2p_ads: free gems earned 285 (9.5/day); revive-eligible defeats 51 (1.70/day); gems to gem-revive all 255; free income covers 100%
payer_pass: free gems earned 280 (9.3/day); revive-eligible defeats 47 (1.57/day); gems to gem-revive all 235; free income covers 100%
Day-30 level n: no-ads 123.5, ads 126.5, payer 130
[--no-rooms]
f2p_no_ads: median P/expP days 3-30 91% (min 88%, max 102%); median enemy scale 0.95 (max 1.00); days scale>1.0: 0
f2p_ads: median P/expP days 3-30 97% (min 93%, max 110%); median enemy scale 0.98 (max 1.00); days scale>1.0: 0
payer_pass: median P/expP days 3-30 101% (min 96%, max 119%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
f2p_no_ads: free gems earned 285 (9.5/day); revive-eligible defeats 54 (1.80/day); gems to gem-revive all 270; free income covers 100%
f2p_ads: free gems earned 285 (9.5/day); revive-eligible defeats 53 (1.77/day); gems to gem-revive all 265; free income covers 100%
payer_pass: free gems earned 285 (9.5/day); revive-eligible defeats 51 (1.70/day); gems to gem-revive all 255; free income covers 100%
Day-30 level n: no-ads 123, ads 125, payer 126
[--win-sens 2.0]
f2p_no_ads: median P/expP days 3-30 93% (min 89%, max 103%); median enemy scale 0.96 (max 1.00); days scale>1.0: 0
f2p_ads: median P/expP days 3-30 100% (min 97%, max 111%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
payer_pass: median P/expP days 3-30 103% (min 99%, max 119%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
f2p_no_ads: free gems earned 285 (9.5/day); revive-eligible defeats 49 (1.63/day); gems to gem-revive all 245; free income covers 100%
f2p_ads: free gems earned 285 (9.5/day); revive-eligible defeats 48 (1.60/day); gems to gem-revive all 240; free income covers 100%
payer_pass: free gems earned 285 (9.5/day); revive-eligible defeats 48 (1.60/day); gems to gem-revive all 240; free income covers 100%
Day-30 level n: no-ads 128, ads 129, payer 129.5
[--weekly-gems 0]
f2p_no_ads: median P/expP days 3-30 94% (min 90%, max 103%); median enemy scale 0.96 (max 1.00); days scale>1.0: 0
f2p_ads: median P/expP days 3-30 100% (min 97%, max 111%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
payer_pass: median P/expP days 3-30 103% (min 99%, max 119%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
f2p_no_ads: free gems earned 145 (4.8/day); revive-eligible defeats 53 (1.77/day); gems to gem-revive all 265; free income covers 55%
f2p_ads: free gems earned 145 (4.8/day); revive-eligible defeats 50 (1.67/day); gems to gem-revive all 250; free income covers 58%
payer_pass: free gems earned 145 (4.8/day); revive-eligible defeats 49 (1.63/day); gems to gem-revive all 245; free income covers 59%
Day-30 level n: no-ads 124, ads 126, payer 127
```
