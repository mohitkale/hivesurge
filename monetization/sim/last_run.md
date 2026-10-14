design_ref=91fed5c seed=42 runs=200 battles/day=6 base_win=0.7 win_sens=2.0 power_k=0.5 scale=clamp(1+0.01(P-expP),0.95,1.0) lossAssist=[[2, 0.95], [3, 0.9]] floor=0.85 xp/tier=270

Target: expectedP(n) from meta-m5.md (= 100% of free ad-watcher by design). Ratio = median P / expectedP(n).

| Day | no-ads n | no-ads P/expP | no-ads enemy scale | ads n | ads P/expP | payer n | payer P/expP |
| --- | -------- | ------------- | ------------------ | ----- | ---------- | ------- | ------------ |
| 1   | 5        | 80%           | 0.99               | 5     | 106%       | 5       | 136%         |
| 2   | 9        | 88%           | 0.99               | 10    | 105%       | 10      | 120%         |
| 3   | 14       | 84%           | 0.97               | 14    | 101%       | 15      | 106%         |
| 5   | 22       | 87%           | 0.96               | 23    | 102%       | 24      | 104%         |
| 7   | 30       | 98%           | 0.99               | 32    | 106%       | 33      | 108%         |
| 10  | 43       | 90%           | 0.96               | 45    | 103%       | 46      | 103%         |
| 14  | 61       | 95%           | 0.97               | 63    | 105%       | 64      | 106%         |
| 21  | 91       | 94%           | 0.97               | 94    | 105%       | 95      | 108%         |
| 30  | 131      | 99%           | 0.99               | 133   | 107%       | 136     | 110%         |

f2p_no_ads P/expectedP over days 3-30: min 82%, median 93%
Longest f2p_no_ads level stall (days with no level gained): 0 -> HARD WALL: no

Season pass (payer_pass, day 30): median tier 33; premium cards 48 of 1073 total cards -> premium share 4.5% (design cap 15%)
Premium Epic share of season Epics (payer_pass, day 30): 19.4%; cards/day 35.8
f2p_no_ads: median P/expP days 3-30 93% (min 82%, max 99%); median enemy scale 0.96 (max 0.99); days scale>1.0: 0
f2p_ads: median P/expP days 3-30 103% (min 100%, max 108%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
payer_pass: median P/expP days 3-30 105% (min 102%, max 110%); median enemy scale 1.00 (max 1.00); days scale>1.0: 0
f2p_no_ads: day-30 median Epic level (mean of 3 Epics, unowned=0) 4.33, best Epic 5, season tier 32
f2p_ads: day-30 median Epic level (mean of 3 Epics, unowned=0) 4.67, best Epic 5, season tier 33
payer_pass: day-30 median Epic level (mean of 3 Epics, unowned=0) 5.00, best Epic 5, season tier 33
Epic-level gap payer - no-ads (day 30): +0.67 -> tier-18-to-gems trigger (>1): no

Gem revive (M2-21a, price 10 gems, 1 revive/battle): free gem income vs revive-eligible defeats over 30 days
f2p_no_ads: free gems earned 230 (7.7/day); revive-eligible defeats 47 (1.57/day); gems to gem-revive all 470; free income covers 49%
f2p_ads: free gems earned 230 (7.7/day); revive-eligible defeats 45 (1.50/day); gems to gem-revive all 450; free income covers 51%
payer_pass: free gems earned 230 (7.7/day); revive-eligible defeats 42 (1.40/day); gems to gem-revive all 420; free income covers 55%
Day-30 level n: no-ads 131, ads 133, payer 136

## Revive coverage variants (seed 42, 200 runs)

```
[--weekly-gems 0]
f2p_no_ads: free gems earned 90 (3.0/day); revive-eligible defeats 47 (1.57/day); gems to gem-revive all 470; free income covers 19%
f2p_ads: free gems earned 90 (3.0/day); revive-eligible defeats 45 (1.50/day); gems to gem-revive all 450; free income covers 20%
payer_pass: free gems earned 90 (3.0/day); revive-eligible defeats 42 (1.40/day); gems to gem-revive all 420; free income covers 21%
[--revive-gems 5]
f2p_no_ads: free gems earned 230 (7.7/day); revive-eligible defeats 47 (1.57/day); gems to gem-revive all 235; free income covers 98%
f2p_ads: free gems earned 230 (7.7/day); revive-eligible defeats 45 (1.50/day); gems to gem-revive all 225; free income covers 100%
payer_pass: free gems earned 230 (7.7/day); revive-eligible defeats 42 (1.40/day); gems to gem-revive all 210; free income covers 100%
[--revive-gems 5 --weekly-gems 0]
f2p_no_ads: free gems earned 90 (3.0/day); revive-eligible defeats 47 (1.57/day); gems to gem-revive all 235; free income covers 38%
f2p_ads: free gems earned 90 (3.0/day); revive-eligible defeats 45 (1.50/day); gems to gem-revive all 225; free income covers 40%
payer_pass: free gems earned 90 (3.0/day); revive-eligible defeats 42 (1.40/day); gems to gem-revive all 210; free income covers 43%
```
