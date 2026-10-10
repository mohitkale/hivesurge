design_ref=866e82b seed=42 runs=200 battles/day=6 base_win=0.7 scale=clamp(1+0.03(P-expP),0.9,1.15)

Target: expectedP(n) from meta-m5.md (= 100% of free ad-watcher by design). Ratio = median P / expectedP(n).

| Day | no-ads n | no-ads P/expP | no-ads enemy scale | ads n | ads P/expP | payer n | payer P/expP |
| --- | -------- | ------------- | ------------------ | ----- | ---------- | ------- | ------------ |
| 1   | 5        | 80%           | 0.97               | 5     | 106%       | 5       | 106%         |
| 2   | 10       | 82%           | 0.94               | 9     | 112%       | 8       | 140%         |
| 3   | 15       | 78%           | 0.90               | 12    | 106%       | 11      | 123%         |
| 5   | 25       | 77%           | 0.90               | 20    | 105%       | 17      | 116%         |
| 7   | 36       | 86%           | 0.90               | 27    | 117%       | 23      | 129%         |
| 10  | 52       | 83%           | 0.90               | 36    | 109%       | 30      | 117%         |
| 14  | 73.5     | 88%           | 0.90               | 48    | 112%       | 42      | 119%         |
| 21  | 111      | 88%           | 0.90               | 68    | 110%       | 59      | 119%         |
| 30  | 159      | 93%           | 0.90               | 94    | 112%       | 81      | 122%         |

f2p_no_ads P/expectedP over days 3-30: min 74%, median 87%
Longest f2p_no_ads level stall (days with no level gained): 0 -> HARD WALL: no

Season pass (payer_pass, day 30): median tier 26; premium cards 48 of 812 total cards -> premium share 5.9% (design cap 15%)
Premium Epic share of season Epics (payer_pass, day 30): 24.5%; cards/day 27.1
f2p_no_ads: median P/expP days 3-30 87% (min 74%, max 93%); median enemy scale 0.90 (max 0.90); days scale>1.0: 0
f2p_ads: median P/expP days 3-30 109% (min 104%, max 117%); median enemy scale 1.14 (max 1.15); days scale>1.0: 30
payer_pass: median P/expP days 3-30 117% (min 113%, max 129%); median enemy scale 1.15 (max 1.15); days scale>1.0: 30
Day-30 level n: no-ads 159, ads 94, payer 81

## Sensitivity (--win-sens)

```
[win-sens 0.0] Season pass (payer_pass, day 30): median tier 29; premium cards 48 of 1010 total cards -> premium share 4.8% (design cap 15%)
[win-sens 0.0] Premium Epic share of season Epics (payer_pass, day 30): 21.3%; cards/day 33.7
[win-sens 0.0] f2p_no_ads: median P/expP days 3-30 94% (min 80%, max 97%); median enemy scale 0.90 (max 0.97); days scale>1.0: 0
[win-sens 0.0] f2p_ads: median P/expP days 3-30 104% (min 100%, max 109%); median enemy scale 1.06 (max 1.13); days scale>1.0: 30
[win-sens 0.0] payer_pass: median P/expP days 3-30 107% (min 102%, max 115%); median enemy scale 1.09 (max 1.15); days scale>1.0: 30
[win-sens 0.0] Day-30 level n: no-ads 126, ads 127, payer 127
[win-sens 1.0] Season pass (payer_pass, day 30): median tier 28; premium cards 48 of 932 total cards -> premium share 5.2% (design cap 15%)
[win-sens 1.0] Premium Epic share of season Epics (payer_pass, day 30): 22.4%; cards/day 31.1
[win-sens 1.0] f2p_no_ads: median P/expP days 3-30 91% (min 78%, max 97%); median enemy scale 0.90 (max 0.94); days scale>1.0: 0
[win-sens 1.0] f2p_ads: median P/expP days 3-30 106% (min 102%, max 111%); median enemy scale 1.08 (max 1.15); days scale>1.0: 30
[win-sens 1.0] payer_pass: median P/expP days 3-30 111% (min 106%, max 120%); median enemy scale 1.14 (max 1.15); days scale>1.0: 30
[win-sens 1.0] Day-30 level n: no-ads 140, ads 114, payer 108
```
