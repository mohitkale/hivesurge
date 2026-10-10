design_ref=209606b seed=42 runs=200 battles/day=6 base_win=0.7 scale=clamp(1+0.03(P-expP),0.9,1.15)

Target: expectedP(n) from meta-m5.md (= 100% of free ad-watcher by design). Ratio = median P / expectedP(n).

| Day | no-ads n | no-ads P/expP | no-ads enemy scale | ads n | ads P/expP | payer n | payer P/expP |
| --- | -------- | ------------- | ------------------ | ----- | ---------- | ------- | ------------ |
| 1   | 5        | 67%           | 0.94               | 5     | 88%        | 5       | 88%          |
| 2   | 11       | 65%           | 0.90               | 10    | 89%        | 9       | 108%         |
| 3   | 16       | 58%           | 0.90               | 14    | 81%        | 13      | 92%          |
| 5   | 27       | 52%           | 0.90               | 25    | 70%        | 23      | 75%          |
| 7   | 37       | 58%           | 0.90               | 36    | 69%        | 34      | 71%          |
| 10  | 53       | 51%           | 0.90               | 52    | 62%        | 51      | 63%          |
| 14  | 75       | 47%           | 0.90               | 74    | 55%        | 72      | 56%          |
| 21  | 113      | 50%           | 0.90               | 111   | 56%        | 110     | 59%          |
| 30  | 161      | 60%           | 0.90               | 159   | 63%        | 158     | 67%          |

f2p_no_ads P/expectedP over days 3-30: min 45%, median 50%
Longest f2p_no_ads level stall (days with no level gained): 0 -> HARD WALL: no

Season pass (payer_pass, day 30): median tier 31; premium cards 48 of 1160 total cards -> premium share 4.1% (design cap 15%)
Day-30 level n: no-ads 161, ads 159, payer 158
