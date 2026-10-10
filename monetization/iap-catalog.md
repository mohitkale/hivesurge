# M5-2 — IAP catalog (test prices)

All prices are **test prices** for Stripe/RevenueCat sandbox. USD anchors come from Mob Control reference prices (plan §4.2 #13–21, App Store at time of research). INR tiers are ASSUMPTIONS (purchasing-power adjusted, not FX-converted), to be validated in soft launch.

Pricing rule (plan §6.2 inference from Stripe pricing 2.9% + 30¢): avoid sub-$2 USD price points on web.
INR note: Stripe charges in INR for Indian cards; recurring INR payments are subject to RBI e-mandate rules → keep subscriptions out of v1 INR.

| SKU id | Title | Type | Grants | USD | INR | Ref placement | Guardrails |
| --- | --- | --- | --- | --- | --- | --- | --- |
| no_ads | No Forced Ads | non-consumable | noAds | 2.99 | ₹149 | #13 | G6, G11 |
| starter_pack | Starter Pack (one-time) | non-consumable | 500 coins, 50 gems, noAds, 1 fixed bee skin | 2.99 | ₹149 | #17 | G6, G7 (cosmetic + small currency), G12 fixed |
| gems_small | Pouch of Gems | consumable | 120 gems | 4.99 | ₹249 | #19 | G6 (must also set noAds) |
| gems_medium | Jar of Gems | consumable | 300 gems (+25%) | 9.99 | ₹499 | #19 | G6 |
| gems_large | Comb of Gems | consumable | 700 gems (+46%) | 19.99 | ₹999 | #19 | G6, G15 |
| skip_tickets_10 | 10 Ad-Skip Tickets | consumable | 10 skip tickets | 2.99 | ₹99 | #14 | G8 |
| season_pass | Season Pass (premium track) | non-consumable per season | premium track | 4.99 | ₹249 | #15 | G7 (free track complete), G13 |

Code delta vs `src/platform/platform.ts CATALOG`: existing 3 SKUs match ids/USD; add `gems_medium`, `gems_large`, `skip_tickets_10`, `season_pass` (season pass after M7-2); change `price` to `{ usd, inr }` and display formatted locale price.

Deferred (not v1): VIP subscription (#16, recurring + INR mandate complexity), premium cannon (#20, pay-to-win risk G7), paid card packs (#18, random → G12/G16), daily offers (#21; revisit with G13).
Portal note: Poki = no IAP at all; CrazyGames IAP invite-only via Xsolla. Catalog applies to own-site build only.
