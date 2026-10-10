# M5-2a last run — design 91fed5c

## k=0.5 (default)
```
design_ref=91fed5c seed=42 runs=200 battles/day=6 base_win=0.7 win_sens=2.0 power_k=0.5 scale=clamp(1+0.01(P-expP),0.95,1.0) lossAssist=[[2, 0.95], [3, 0.9]] floor=0.85 xp/tier=270

Target: expectedP(n) from meta-m5.md (= 100% of free ad-watcher by design). Ratio = median P / expectedP(n).

| Day | no-ads n | no-ads P/expP | no-ads enemy scale | ads n | ads P/expP | payer n | payer P/expP |
|---|---|---|---|---|---|---|---|
| 1 | 5 | 80% | 0.99 | 5 | 106% | 5 | 122% |
| 2 | 9 | 88% | 0.99 | 10 | 106% | 10 | 121% |
| 3 | 14 | 84% | 0.97 | 14 | 105% | 15 | 110% |
| 5 | 22 | 87% | 0.96 | 23 | 101% | 24 | 106% |
| 7 | 31 | 97% | 0.99 | 32 | 106% | 33 | 108% |
| 10 | 44 | 91% | 0.96 | 45 | 103% | 46 | 103% |
| 14 | 61 | 95% | 0.98 | 63 | 104% | 64 | 105% |
| 21 | 92 | 95% | 0.97 | 93 | 105% | 95 | 108% |
| 30 | 132 | 99% | 1.00 | 134 | 107% | 135 | 110% |

f2p_no_ads P/expectedP over days 3-30: min 82%, median 93%
Longest f2p_no_ads level stall (days with no level gained): 0 -> HARD WALL: no

Season pass (payer_pass, day 30): median tier 33; premium cards 48 of 1073 total cards -> premium share 4.5% (design cap 15%)
Premium Epic share of season Epics (payer_pass, day 30): 19.4%; cards/day 35.8
f2p_no_ads: median P/expP days 3-30 93% (min 82%, max 99%); median enemy scale 0.96 (max 1.00); days scale>1.0: 0
f2p_ads: median P/expP days 3-30 104% (min 99%, max 108%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
payer_pass: median P/expP days 3-30 106% (min 102%, max 110%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
f2p_no_ads: day-30 median Epic level (mean of 3 Epics, unowned=0) 4.33, best Epic 5, season tier 33
f2p_ads: day-30 median Epic level (mean of 3 Epics, unowned=0) 4.67, best Epic 5, season tier 33
payer_pass: day-30 median Epic level (mean of 3 Epics, unowned=0) 5.00, best Epic 5, season tier 33
Epic-level gap payer - no-ads (day 30): +0.67 -> tier-18-to-gems trigger (>1): no
Day-30 level n: no-ads 132, ads 134, payer 135
```

## k=0.3
```
design_ref=91fed5c seed=42 runs=200 battles/day=6 base_win=0.7 win_sens=2.0 power_k=0.3 scale=clamp(1+0.01(P-expP),0.95,1.0) lossAssist=[[2, 0.95], [3, 0.9]] floor=0.85 xp/tier=270

Target: expectedP(n) from meta-m5.md (= 100% of free ad-watcher by design). Ratio = median P / expectedP(n).

| Day | no-ads n | no-ads P/expP | no-ads enemy scale | ads n | ads P/expP | payer n | payer P/expP |
|---|---|---|---|---|---|---|---|
| 1 | 5 | 80% | 0.99 | 5 | 106% | 5 | 136% |
| 2 | 9 | 86% | 0.99 | 10 | 106% | 10 | 123% |
| 3 | 14 | 82% | 0.97 | 14 | 105% | 15 | 110% |
| 5 | 22 | 85% | 0.96 | 23 | 101% | 24 | 105% |
| 7 | 31 | 95% | 0.98 | 32 | 106% | 32 | 108% |
| 10 | 44 | 90% | 0.96 | 45 | 104% | 45.5 | 105% |
| 14 | 63 | 95% | 0.97 | 63 | 104% | 63 | 105% |
| 21 | 94 | 94% | 0.96 | 93 | 104% | 94 | 108% |
| 30 | 135.5 | 98% | 0.99 | 132 | 107% | 134 | 110% |

f2p_no_ads P/expectedP over days 3-30: min 80%, median 92%
Longest f2p_no_ads level stall (days with no level gained): 0 -> HARD WALL: no

Season pass (payer_pass, day 30): median tier 33; premium cards 48 of 1061 total cards -> premium share 4.5% (design cap 15%)
Premium Epic share of season Epics (payer_pass, day 30): 19.5%; cards/day 35.4
f2p_no_ads: median P/expP days 3-30 92% (min 80%, max 98%); median enemy scale 0.96 (max 0.99); days scale>1.0: 0
f2p_ads: median P/expP days 3-30 104% (min 99%, max 108%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
payer_pass: median P/expP days 3-30 105% (min 103%, max 110%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
f2p_no_ads: day-30 median Epic level (mean of 3 Epics, unowned=0) 4.33, best Epic 5, season tier 33
f2p_ads: day-30 median Epic level (mean of 3 Epics, unowned=0) 4.67, best Epic 5, season tier 33
payer_pass: day-30 median Epic level (mean of 3 Epics, unowned=0) 5.00, best Epic 5, season tier 33
Epic-level gap payer - no-ads (day 30): +0.67 -> tier-18-to-gems trigger (>1): no
Day-30 level n: no-ads 135.5, ads 132, payer 134
```

## Sensitivity (100 runs): day-30 stage
```
k=0.0 seed42 (200 runs): no-ads 139, ads 130, payer 129
[--power-k 0.5 --seed 7] Day-30 level n: no-ads 133, ads 134, payer 136
[--power-k 0.3 --seed 7] Day-30 level n: no-ads 135.5, ads 133, payer 134
[--power-k 0.5 --win-sens 1.0] Day-30 level n: no-ads 128, ads 132, payer 135
[--power-k 0.3 --win-sens 1.0] Day-30 level n: no-ads 128, ads 132, payer 133
```
