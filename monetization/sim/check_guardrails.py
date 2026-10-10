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
print("\n".join(fail) or f"OK: {len(skus)} SKUs fixed-content, all grant noAds, all >= $2")
sys.exit(1 if fail else 0)
