#!/usr/bin/env python3
"""Hive Surge 30-day economy sim (M5-2 / M5-2a). Deterministic (seeded). Test-mode, no real money.
Run: python3 monetization/sim/economy_sim.py [--seed N] [--runs N] [--md]

SOURCE tags: CODE = fix/pr-002-review src/sim/rewards.ts, src/platform/platform.ts
             META = design/m2-specs docs/design/meta-m5.md   LIVE = docs/design/liveops-m7.md
             ASSUMPTION = MON placeholder, tune with playtest data."""
import random, sys, statistics as st

# ---- tables ---------------------------------------------------------------
WIN_COINS = (50, 125)            # CODE rewards.ts: 50 + 0..30 hive + timeLeft/2 (META says 50-125)
LOSS_COINS = (0, 20)             # CODE: nestDamage*20
CHEST = {  # META chests: cards, coins range, unlock minutes, odds C/R/E/L %
 'wood':  (3, (30, 60),  15,  (80, 18, 2, 0)),
 'silver':(6, (80, 150), 60,  (70, 24, 5.5, .5)),
 'gold':  (12,(200, 400),240, (60, 28, 10, 2)),
 'royal': (20,(500, 500),480, (50, 30, 15, 5)),   # + 1 guaranteed epic (META)
}
WIN_CHEST = (('wood', .70), ('silver', .25), ('gold', .05))   # META
BEES = {'C': ['worker','bumble','dart'], 'R': ['carpenter','mason','sweat'],
        'E': ['orchid','leafcutter','honeyguard'], 'L': ['royal-jelly','sunburst','frost-wing']}
RW = {'C':1,'R':2,'E':3,'L':4}                                  # META power weights
MAXLVL = {'C':10,'R':9,'E':8,'L':7}                             # META
POLLEN = [(2,2,1,1),(4,3,2,1),(10,6,4,2),(20,12,8,4),(40,25,15,8),(80,50,30,15)]  # META L1->7
COINS_UP = [50,150,400,1000,2000,4000]                          # META L1->7
# ASSUMPTION: META table stops at L7; extend x2/level for C/R levels 8-10
for _ in range(3):
    POLLEN.append(tuple(p*2 for p in POLLEN[-1])); COINS_UP.append(COINS_UP[-1]*2)
DAILY_TARGET_COINS = 100+80+80   # LIVE: assume 3 coin targets avg ~87 each (ASSUMPTION mix)
LOGIN = [('coins',100),('chest','wood'),('gems',5),('coins',300),('chest','silver'),('gems',10),('chest','royal')]  # LIVE
FREE_DAILY_WOOD = True           # META hive free daily chest
PITY = 40                        # META legendary pity

# ---- personas (ASSUMPTION) -------------------------------------------------
PERSONAS = {
 'f2p_no_ads':   dict(ads=False, pay=False),
 'f2p_ads':      dict(ads=True,  pay=False),   # 2x win coins (cap 6/session, 20/day per ad-placements.md), chest ad halves timer x3/day
 'payer_starter':dict(ads=True,  pay=True),    # starter_pack (CODE: 500 coins, 50 gems) on day 1
}
BATTLES_PER_DAY = 6; SESSIONS_PER_DAY = 3; WIN_RATE = .70   # ASSUMPTION
SLOTS = 4

def roll_cards(rng, n, odds, st_):
    out=[]
    for _ in range(n):
        st_['pity']+=1
        r = 'L' if st_['pity']>=PITY else rng.choices('CREL', weights=odds)[0]
        if r=='L': st_['pity']=0
        out.append(rng.choice(BEES[r]))
    return out

def rarity(b): return next(k for k,v in BEES.items() if b in v)

def run(persona, seed, days=30):
    rng=random.Random(seed); p=PERSONAS[persona]
    s=dict(coins=0,gems=0,pity=0,bees={b:[0,0] for v in BEES.values() for b in v},spent_gems=0)  # [level,pollen]; level0 = not owned
    s['bees']['worker'][0]=1
    if p['pay']: s['coins']+=500; s['gems']+=50
    slots=[]; per_day=[]
    def open_chest(t):
        n,(lo,hi),_,odds=CHEST[t]; s['coins']+=rng.randint(lo,hi)
        cards=roll_cards(rng,n,odds,s)
        if t=='royal': cards.append(rng.choice(BEES['E']))
        for b in cards:
            lv=s['bees'][b]
            if lv[0]==0: lv[0]=1
            else: lv[1]+=1
    def upgrade():
        changed=True
        while changed:
            changed=False
            for b,lv in sorted(s['bees'].items(), key=lambda kv: kv[1][0]):
                r=rarity(b); L=lv[0]
                if L==0 or L>=MAXLVL[r]: continue
                need=POLLEN[L-1]['CREL'.index(r)]; cost=COINS_UP[L-1]
                if lv[1]>=need and s['coins']>=cost:
                    lv[1]-=need; s['coins']-=cost; lv[0]+=1; changed=True
    for d in range(days):
        kind,val=LOGIN[d%7]
        if kind=='coins': s['coins']+=val
        elif kind=='gems': s['gems']+=val
        else: open_chest(val)
        if FREE_DAILY_WOOD: open_chest('wood')
        s['coins']+=DAILY_TARGET_COINS; open_chest('wood')     # LIVE daily bonus wood chest
        ads_today=0; chest_ads=0
        for sess in range(SESSIONS_PER_DAY):
            # chests unlock between sessions (>=4h apart, ASSUMPTION): one unlocking chest at a time
            if slots:
                t=slots.pop(0); open_chest(t)
            for _ in range(BATTLES_PER_DAY//SESSIONS_PER_DAY):
                if rng.random()<WIN_RATE:
                    c=rng.randint(*WIN_COINS)
                    if p['ads'] and ads_today<20: c*=2; ads_today+=1
                    t=rng.choices([c_ for c_,_ in WIN_CHEST],[w for _,w in WIN_CHEST])[0]
                    if len(slots)<SLOTS: slots.append(t)
                    else: c=int(c*1.5)   # META: slots full -> coins x1.5
                    s['coins']+=c
                else: s['coins']+=rng.randint(*LOSS_COINS)
            # in-session: ad halves timer (<=3/day) lets one more short chest open; gems skip wood chests (3 gems)
            if slots and p['ads'] and chest_ads<3 and CHEST[slots[0]][2]<=60:
                open_chest(slots.pop(0)); chest_ads+=1
            if slots and slots[0]=='wood' and s['gems']>=3 and p['pay']:
                s['gems']-=3; open_chest(slots.pop(0))
            upgrade()
        power=sum(lv[0]*RW[rarity(b)] for b,lv in s['bees'].items() if lv[0])
        per_day.append(dict(day=d+1,power=power,coins=s['coins'],owned=sum(1 for lv in s['bees'].values() if lv[0])))
    return per_day

def main():
    a=sys.argv; seed=int(a[a.index('--seed')+1]) if '--seed' in a else 42
    runs=int(a[a.index('--runs')+1]) if '--runs' in a else 200
    res={k:[run(k,seed+i) for i in range(runs)] for k in PERSONAS}
    med=lambda k,d,f: st.median(r[d][f] for r in res[k])
    # TARGET (ASSUMPTION): expectedP(day) = 85% of median f2p_ads power. Falling below => meta generator
    # (META: E x (1+0.03(P-expP))) would ease levels, so "behind" = soft gap, not a wall.
    print(f"seed={seed} runs={runs} battles/day={BATTLES_PER_DAY} winrate={WIN_RATE}\n")
    print("| Day | f2p_no_ads P | f2p_ads P | payer_starter P | target P (85% f2p_ads) | f2p_no_ads behind? |")
    print("|---|---|---|---|---|---|")
    behind=[]
    for d in range(30):
        t=0.85*med('f2p_ads',d,'power'); n=med('f2p_no_ads',d,'power')
        if n<t: behind.append(d+1)
        if d+1 in (1,3,7,10,14,21,30) or (n<t and d+1 not in behind[:-1]):
            print(f"| {d+1} | {n:g} | {med('f2p_ads',d,'power'):g} | {med('payer_starter',d,'power'):g} | {t:.1f} | {'YES' if n<t else 'no'} |")
    gap=med('payer_starter',29,'power')/med('f2p_no_ads',29,'power')
    print(f"\nDays f2p_no_ads below target: {behind or 'none'}")
    print(f"Day-30 payer/f2p_no_ads power ratio: {gap:.2f}")
    # HARD WALL check: longest run of days with zero median power gain for f2p_no_ads (wall if >= 3, ASSUMPTION)
    longest=cur=0
    for d in range(1,30):
        cur = cur+1 if med('f2p_no_ads',d,'power')<=med('f2p_no_ads',d-1,'power') else 0
        longest=max(longest,cur)
    print(f"Longest f2p_no_ads stall (days with no power gain): {longest} -> HARD WALL: {'YES' if longest>=3 else 'no'}")
if __name__=='__main__': main()
