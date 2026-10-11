#!/usr/bin/env python3
"""M5-11 / G6 / G12 catalog checks over monetization/skus.json. Exit 1 on failure.
- every paid SKU has random:false and grants contain no chest/card/pack/spin keys (no paid random items)
- every paid SKU grants noAds (G6: any purchase removes forced ads)
- gems are not a real-money route to random items: flagged as REV item (gem chest-skip only speeds earned chests)."""
import json, pathlib, sys
skus=json.loads((pathlib.Path(__file__).parent.parent/'skus.json').read_text())
RANDOM_KEYS={'chest','chests','cards','pack','packs','spin','spins','lootbox'}
fail=[]
for s in skus:
    if s.get('random') is not False: fail.append(f"{s['id']}: random must be false (M5-11)")
    if RANDOM_KEYS & set(s['grants']): fail.append(f"{s['id']}: grants random content {RANDOM_KEYS & set(s['grants'])} (M5-11)")
    if not s['grants'].get('noAds'): fail.append(f"{s['id']}: must grant noAds (G6)")
    for c in s.get('contents',[]):
        if c.get('random'): fail.append(f"{s['id']} tier {c['tier']}: {c['item']} is random content in a paid track (M5-11)")
    if s['usd']<2: fail.append(f"{s['id']}: < $2 web price floor (iap-catalog.md)")
# G19 (M2-21a): gem-priced revive config, monetization/revive-gem.json
rv=json.loads((pathlib.Path(__file__).parent.parent/'revive-gem.json').read_text())
gems_small=next(x for x in skus if x['id']=='gems_small')
usd_per_gem=gems_small['usd']/gems_small['grants']['gems']
G19={
 'price fixed (no escalation)': rv['escalation'] is False,
 'one revive per battle across ad/free/gem': rv['max_revives_per_battle_total']==1,
 'gem revive daily cap <= 3': 0 < rv['max_gem_revives_per_day'] <= 3,
 'session cap <= daily cap': rv['max_gem_revives_per_session'] <= rv['max_gem_revives_per_day'],
 'no offer in FTUE (>= 3 battles, G2)': rv['ftue_battles_without_offer'] >= 3,
 'no buy-gems upsell from revive offer': rv['buy_gems_upsell_from_offer'] is False,
 'no gem revive on event final level': rv['offer_on_event_final_level'] is False,
 'countdown pauses on gem confirm': rv['countdown_pauses_on_gem_confirm'] is True,
 'no pre-selected/default paid button': rv['default_button']=='none',
 'price <= $0.50 equivalent at gems_small rate': rv['price_gems']*usd_per_gem <= 0.50,
}
fail += [f"revive-gem.json: G19 '{k}' violated" for k,ok in G19.items() if not ok]
print("\n".join(fail) or f"OK: {len(skus)} SKUs fixed-content, all grant noAds, all >= $2; G19 gem revive {rv['price_gems']} gems (~${rv['price_gems']*usd_per_gem:.2f}) passes {len(G19)} checks")
sys.exit(1 if fail else 0)
