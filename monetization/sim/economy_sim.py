#!/usr/bin/env python3
"""Hive Surge 30-day economy sim (M5-2 / M5-2a). Seeded and reproducible. Test mode only, no real money.

Run (from repo root):  python3 monetization/sim/economy_sim.py [--seed 42] [--runs 200] [--design-ref 209606b]

Design tables are READ from git at --design-ref (default 866e82b on design/m2-specs):
  docs/design/meta-m5.md   -> bee roster, expectedP(n) table, enemy scaling clamp
  docs/design/liveops-m7.md -> season pass free/premium tracks, XP per tier
Other tags: CODE = src/sim/rewards.ts (fix/pr-002-review); ASSUMPTION = MON placeholder (tune with playtests)."""
import random, re, subprocess, sys, statistics as st

A = sys.argv
arg = lambda k, d: type(d)(A[A.index(k) + 1]) if k in A else d
SEED, RUNS, REF, DAYS = arg('--seed', 42), arg('--runs', 200), arg('--design-ref', '866e82b'), 30

def design(path):
    return subprocess.run(['git', 'show', f'{REF}:{path}'], capture_output=True, text=True, check=True).stdout
META, LIVE = design('docs/design/meta-m5.md'), design('docs/design/liveops-m7.md')
rows = lambda txt: [[c.strip() for c in l.strip().strip('|').split('|')] for l in txt.splitlines() if l.strip().startswith('|')]

# ---- META: bees ------------------------------------------------------------
BEE = {}  # id -> (name, rarity letter)
for r in rows(META):
    if len(r) == 4 and r[2] in ('Common', 'Rare', 'Epic', 'Legendary'):
        BEE[r[0]] = (r[1], r[2][0])
BYRAR = {k: [b for b, (_, rr) in BEE.items() if rr == k] for k in 'CREL'}
NAME2ID = {re.sub(r'[^a-z]', '', n.lower()): b for b, (n, _) in BEE.items()}
RW = {'C': 1, 'R': 2, 'E': 3, 'L': 4}
MAXLVL = {'C': 10, 'R': 9, 'E': 8, 'L': 7}
POLLEN = [(2,2,1,1),(4,3,2,1),(10,6,4,2),(20,12,8,4),(40,25,15,8),(80,50,30,15)]  # META levels table
COINS_UP = [50, 150, 400, 1000, 2000, 4000]
for _ in range(3):  # ASSUMPTION: META table stops at L7; C/R L7->10 extrapolated x2
    POLLEN.append(tuple(p * 2 for p in POLLEN[-1])); COINS_UP.append(COINS_UP[-1] * 2)
SLOT_AT = [3, 5, 8, 12]  # META loadout slots unlock at level n

# ---- META: expectedP(n) + scaling ------------------------------------------
EXP_PTS = []
_EXP_SEC = META.split('### expectedP', 1)[1].split('Formula:', 1)[0]
for r in rows(_EXP_SEC):
    if len(r) >= 3 and re.fullmatch(r'\d+( to \d+)?', r[0]) and r[2].isdigit():
        EXP_PTS.append((int(r[0].split(' to ')[-1]), int(r[2])))
EXP_PTS.sort()
_t = re.search(r'Beyond n = (\d+): `expectedP\(n\) = ([\d.]+) \+ ([\d.]+) x \(n - \d+\)`?, capped at (\d+)', META)
TAIL = (int(_t.group(1)), float(_t.group(2)), float(_t.group(3)), float(_t.group(4)))
def expectedP(n):
    if n <= EXP_PTS[0][0]: return EXP_PTS[0][1]
    for (a, pa), (b, pb) in zip(EXP_PTS, EXP_PTS[1:]):
        if n <= b: return pa + (pb - pa) * (n - a) / (b - a)
    return min(TAIL[3], TAIL[1] + TAIL[2] * (n - TAIL[0]))  # META tail formula
m = re.search(r'clamp\(1 \+ ([\d.]+) x \(P - expectedP\(n\)\), ([\d.]+), ([\d.]+)\)', META)
K, LO, HI = float(m.group(1)), float(m.group(2)), float(m.group(3))
def enemy_scale(P, n): return max(LO, min(HI, 1 + K * (P - expectedP(n))))
BASE_WIN, WIN_SENS = 0.70, arg('--win-sens', 2.0)  # ASSUMPTION: 70% at scale 1.0; each +1% enemies = -2 pts win rate
def win_rate(P, n): return max(0.05, min(0.95, BASE_WIN - WIN_SENS * (enemy_scale(P, n) - 1)))

# ---- LIVE: season pass ------------------------------------------------------
XP_TIER = int(re.search(r'XP per tier: (\d+)', LIVE).group(1))
TRACK = {}  # tier -> (free, premium)
for r in rows(LIVE):
    if len(r) >= 3 and r[0].isdigit(): TRACK[int(r[0])] = (r[1], r[2])
OTHER_FREE, OTHER_PREM = 150, 300  # LIVE "Other tiers: free 150 coins, premium 300 coins"
def parse_reward(txt):
    """-> dict(coins, gems, chests[], cards{bee:n} fixed, random_cards[(rarity,n)])"""
    out = dict(coins=0, gems=0, chests=[], cards={}, random_cards=[])
    for part in re.split(r'\s\+\s', txt):
        p = part.strip()
        if mm := re.match(r'(\d+) coins', p): out['coins'] += int(mm.group(1))
        elif mm := re.search(r'(\d+) gems', p): out['gems'] += int(mm.group(1))
        elif mm := re.match(r'(Wood|Silver|Gold|Royal) chest', p): out['chests'].append(mm.group(1).lower())
        elif mm := re.match(r'(\d+) (.+?) cards?', p):
            key = re.sub(r'[^a-z]', '', mm.group(2).lower())
            bee = NAME2ID.get(key) or next((v for k, v in NAME2ID.items() if k.startswith(key) or key.startswith(k)), None)
            if bee is None: raise SystemExit(f'unknown bee in season track: {p!r}')
            out['cards'][bee] = out['cards'].get(bee, 0) + int(mm.group(1))
        elif mm := re.match(r'(Common|Rare|Epic|Legendary) card x(\d+)', p): out['random_cards'].append((mm.group(1)[0], int(mm.group(2))))
    return out

# ---- other tables ----------------------------------------------------------
WIN_COINS, LOSS_COINS = (50, 125), (0, 20)  # CODE rewards.ts
CHEST = {'wood': (3, (30, 60), (80, 18, 2, 0)), 'silver': (6, (80, 150), (70, 24, 5.5, .5)),
         'gold': (12, (200, 400), (60, 28, 10, 2)), 'royal': (20, (500, 500), (50, 30, 15, 5))}  # META
UNLOCK_MIN = {'wood': 15, 'silver': 60, 'gold': 240, 'royal': 480}  # META
WIN_CHEST = (('wood', .70), ('silver', .25), ('gold', .05))  # META
LOGIN = [('coins', 100), ('chest', 'wood'), ('gems', 5), ('coins', 300), ('chest', 'silver'), ('gems', 10), ('chest', 'royal')]  # LIVE
DAILY_TARGET_COINS = 260  # LIVE pool, ASSUMPTION mix of 3 coin targets
DAILY_XP = 3 * 20 + 50    # LIVE: 20/target + 50 daily bonus
WEEKLY_XP = 3 * 100       # ASSUMPTION: 3 of 5 weekly targets completed
PITY, SLOTS, BATTLES, SESSIONS = 40, 4, 6, 3  # META / ASSUMPTION
PERSONAS = {  # ASSUMPTION persona definitions
    'f2p_no_ads': dict(ads=False, pass_=False, starter=False),
    'f2p_ads': dict(ads=True, pass_=False, starter=False),       # = META expectedP baseline player
    'payer_pass': dict(ads=True, pass_=True, starter=True),     # starter pack + season pass day 1
}

def run(persona, seed):
    rng, p = random.Random(seed), PERSONAS[persona]
    s = dict(coins=0, gems=0, pity=0, n=1, xp=0, tier=0, cards_chest=0, cards_prem=0, cards_free_track=0)
    bees = {b: [0, 0] for b in BEE}; bees['worker'][0] = 1
    if p['starter']: s['coins'] += 500; s['gems'] += 50  # CODE CATALOG starter_pack
    slots, out = [], []
    def add_card(b, kind):
        if BEE[b][1] == 'E': s['epic_' + kind] = s.get('epic_' + kind, 0) + 1
        lv = bees[b]
        if lv[0] == 0: lv[0] = 1
        else: lv[1] += 1
        s[kind] += 1
    def open_chest(t, kind='cards_chest'):
        n, (lo, hi), odds = CHEST[t]; s['coins'] += rng.randint(lo, hi)
        for _ in range(n):
            s['pity'] += 1
            r = 'L' if s['pity'] >= PITY else rng.choices('CREL', weights=odds)[0]
            if r == 'L': s['pity'] = 0
            add_card(rng.choice(BYRAR[r]), kind)
        if t == 'royal': add_card(rng.choice(BYRAR['E']), kind)
    def grant(txt, kind):
        g = parse_reward(txt); s['coins'] += g['coins']; s['gems'] += g['gems']
        for c in g['chests']: open_chest(c, kind)
        for b, k in g['cards'].items():
            for _ in range(k): add_card(b, kind)
        for r, k in g['random_cards']:
            for _ in range(k): add_card(rng.choice(BYRAR[r]), kind)
    def add_xp(x):
        s['xp'] += x
        while s['xp'] >= (s['tier'] + 1) * XP_TIER:
            s['tier'] += 1; t = s['tier']
            if t > 30:
                if t <= 32 + 10:  # ~600 XP = 2 tiers per bonus, max 10 (LIVE)
                    if t % 2 == 0:
                        open_chest('silver', 'cards_free_track')
                        if p['pass_']: s['coins'] += 150; s['gems'] += 15
                continue
            free, prem = TRACK.get(t, (f'{OTHER_FREE} coins', f'{OTHER_PREM} coins'))
            grant(free, 'cards_free_track')
            if p['pass_']: grant(prem, 'cards_prem')
    def nslots(): return sum(1 for a in SLOT_AT if s['n'] >= a)
    def power():  # META: equipped loadout only, worker excluded; best bees by level x weight
        vals = sorted((lv[0] * RW[BEE[b][1]] for b, lv in bees.items() if lv[0] and b != 'worker'), reverse=True)
        return sum(vals[:nslots()])
    def upgrade():
        ch = True
        while ch:
            ch = False
            for b, lv in sorted(bees.items(), key=lambda kv: (-RW[BEE[kv[0]][1]], kv[1][0])):
                r = BEE[b][1]; L = lv[0]
                if L == 0 or L >= MAXLVL[r]: continue
                need, cost = POLLEN[L - 1]['CREL'.index(r)], COINS_UP[L - 1]
                if lv[1] >= need and s['coins'] >= cost:
                    lv[1] -= need; s['coins'] -= cost; lv[0] += 1; ch = True
    for d in range(DAYS):
        kind, val = LOGIN[d % 7]
        if kind == 'coins': s['coins'] += val
        elif kind == 'gems': s['gems'] += val
        else: open_chest(val)
        open_chest('wood')                      # META free daily Wood
        s['coins'] += DAILY_TARGET_COINS; open_chest('wood')  # LIVE daily bonus Wood chest
        if p['ads']: open_chest('wood')         # META/M5-5 rewarded daily pack (ASSUMPTION: = Wood)
        add_xp(DAILY_XP + (WEEKLY_XP if d % 7 == 6 else 0))
        ads_today = chest_ads = 0
        gaps = []
        for sess in range(SESSIONS):
            if slots: open_chest(slots.pop(0))  # ASSUMPTION: 1 chest unlocks per gap between sessions
            for _ in range(BATTLES // SESSIONS):
                P = power(); wr = win_rate(P, s['n'])
                if rng.random() < wr:
                    s['n'] += 1; add_xp(30)
                    c = rng.randint(*WIN_COINS)
                    if p['ads'] and ads_today < 20: c *= 2; ads_today += 1
                    t = rng.choices([x for x, _ in WIN_CHEST], [w for _, w in WIN_CHEST])[0]
                    if len(slots) < SLOTS: slots.append(t)
                    else: c = int(c * 1.5)  # META slots-full bonus
                    s['coins'] += c
                else:
                    s['coins'] += rng.randint(*LOSS_COINS); add_xp(10)
            if slots and p['ads'] and chest_ads < 3 and UNLOCK_MIN[slots[0]] <= 60:  # M5-5: ad halves timer, 3/day
                open_chest(slots.pop(0)); chest_ads += 1
            upgrade()
        P = power()
        out.append(dict(day=d + 1, n=s['n'], P=P, exp=expectedP(s['n']), scale=enemy_scale(P, s['n']),
                        epic_prem=s.get('epic_cards_prem', 0), epic_all=sum(v for k, v in s.items() if k.startswith('epic_')), tier=s['tier'], prem=s['cards_prem'], chest=s['cards_chest'], free_track=s['cards_free_track']))
    return out

def main():
    res = {k: [run(k, SEED + i) for i in range(RUNS)] for k in PERSONAS}
    med = lambda k, d, f: st.median(r[d][f] for r in res[k])
    print(f"design_ref={REF} seed={SEED} runs={RUNS} battles/day={BATTLES} base_win={BASE_WIN} scale=clamp(1+{K}(P-expP),{LO},{HI})\n")
    print("Target: expectedP(n) from meta-m5.md (= 100% of free ad-watcher by design). Ratio = median P / expectedP(n).\n")
    print("| Day | no-ads n | no-ads P/expP | no-ads enemy scale | ads n | ads P/expP | payer n | payer P/expP |")
    print("|---|---|---|---|---|---|---|---|")
    ratio = lambda k, d: st.median(r[d]['P'] / r[d]['exp'] if r[d]['exp'] else 1 for r in res[k])
    for d in range(DAYS):
        if d + 1 in (1, 2, 3, 5, 7, 10, 14, 21, 30):
            print(f"| {d+1} | {med('f2p_no_ads',d,'n'):g} | {ratio('f2p_no_ads',d):.0%} | {med('f2p_no_ads',d,'scale'):.2f} | "
                  f"{med('f2p_ads',d,'n'):g} | {ratio('f2p_ads',d):.0%} | {med('payer_pass',d,'n'):g} | {ratio('payer_pass',d):.0%} |")
    nr = [ratio('f2p_no_ads', d) for d in range(DAYS)]
    print(f"\nf2p_no_ads P/expectedP over days 3-30: min {min(nr[2:]):.0%}, median {st.median(nr[2:]):.0%}")
    longest = cur = 0
    for d in range(1, DAYS):
        cur = cur + 1 if med('f2p_no_ads', d, 'n') <= med('f2p_no_ads', d - 1, 'n') else 0
        longest = max(longest, cur)
    print(f"Longest f2p_no_ads level stall (days with no level gained): {longest} -> HARD WALL: {'YES' if longest >= 3 else 'no'}")
    # premium card share
    tot = lambda r: r['prem'] + r['chest'] + r['free_track']
    share = st.median(r[-1]['prem'] / tot(r[-1]) for r in res['payer_pass'])
    print(f"\nSeason pass (payer_pass, day 30): median tier {med('payer_pass',29,'tier'):g}; premium cards {med('payer_pass',29,'prem'):g} "
          f"of {st.median(tot(r[-1]) for r in res['payer_pass']):g} total cards -> premium share {share:.1%} (design cap 15%)")
    eshare = st.median(r[-1]['epic_prem'] / r[-1]['epic_all'] for r in res['payer_pass'])
    print(f"Premium Epic share of season Epics (payer_pass, day 30): {eshare:.1%}; cards/day {st.median(tot(r[-1]) for r in res['payer_pass'])/DAYS:.1f}")
    for k in PERSONAS:
        rr = [ratio(k, d) for d in range(DAYS)]; sc = [med(k, d, 'scale') for d in range(DAYS)]
        print(f"{k}: median P/expP days 3-30 {st.median(rr[2:]):.0%} (min {min(rr[2:]):.0%}, max {max(rr[2:]):.0%}); "
              f"median enemy scale {st.median(sc[2:]):.2f} (max {max(sc[2:]):.2f}); days scale>1.0: {sum(1 for x in sc if x > 1.0)}")
    print(f"Day-30 level n: no-ads {med('f2p_no_ads',29,'n'):g}, ads {med('f2p_ads',29,'n'):g}, payer {med('payer_pass',29,'n'):g}")

if __name__ == '__main__':
    main()
