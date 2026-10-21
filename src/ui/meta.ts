import {
  BEES,
  beeDef,
  CHESTS,
  MAX_LEVEL,
  type Rarity,
  ROOMS,
  type RoomId,
  ROOM_IDS,
  xpForLevel,
} from '../meta/defs';
import {
  buildBlock,
  type ChestReward,
  chestCardCount,
  freeChestReady,
  gemSkipCost,
  honeyPending,
  loadoutPower,
  playerLevel,
  roomCap,
  roomLevel,
  roomUpgradeCost,
  unlockedSlots,
  upgradeCost,
} from '../meta/economy';
import { PENDING_EFFECTS } from '../meta/mods';
import { CHEST_SLOTS, PITY_LEGENDARY, SLOT_UNLOCK_STAGES } from '../meta/defs';
import type { Chest } from '../platform/saveMeta';
import type { SaveData } from '../platform/save';

/**
 * M5-4 meta screens as pure HTML builders (testable without a DOM): chest row, chest info with
 * the odds table (G12), chest opening, bee collection + loadout, hive base, next-goal bar (M5-12).
 */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const RNAME: Record<Rarity, string> = { C: 'Common', R: 'Rare', E: 'Epic', L: 'Legendary' };
const CICON: Record<string, string> = { wood: '📦', silver: '🥈', gold: '🥇', royal: '👑' };

export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${s}s`;
}

export type ChestState = 'locked' | 'unlocking' | 'ready';
export const chestState = (c: Chest, now: number): ChestState =>
  c.unlockAt === null ? 'locked' : c.unlockAt > now ? 'unlocking' : 'ready';

/** Home chest row: 4 slots + the free daily chest. Timers carry `data-until` for live ticks. */
export function chestRowHtml(s: SaveData, now: number): string {
  const slots: string[] = [];
  for (let i = 0; i < CHEST_SLOTS; i++) {
    const c = s.meta.chests[i];
    if (!c) {
      slots.push('<li class="chest-slot empty"><small>Win to earn</small></li>');
      continue;
    }
    const st = chestState(c, now);
    const label =
      st === 'ready'
        ? '<b>Open!</b>'
        : st === 'unlocking'
          ? `<small data-until="${c.unlockAt}">${fmtDuration(c.unlockAt! - now)}</small>`
          : `<small>${fmtDuration(CHESTS[c.type].unlockMs)}</small>`;
    slots.push(
      `<li class="chest-slot ${st}"><button class="chest-btn" data-a="chest:${esc(c.id)}" aria-label="${CHESTS[c.type].name} chest, ${st}">
        <span class="chest-icon">${CICON[c.type]}</span>${label}</button></li>`,
    );
  }
  const free = freeChestReady(s, now)
    ? '<button class="btn" data-a="freechest">🎁 Free chest</button>'
    : `<span class="small">Free chest in <span data-until="${s.meta.freeChestAt + 86_400_000}">${fmtDuration(s.meta.freeChestAt + 86_400_000 - now)}</span></span>`;
  return `<section class="home-sec chests"><h3>Chests <small>${s.meta.chests.length}/${CHEST_SLOTS}</small></h3>
    <ul class="chest-row">${slots.join('')}</ul><div class="row">${free}</div></section>`;
}

/** Per-card odds table (G12: shown on every chest tap). */
export function oddsTableHtml(type: keyof typeof CHESTS): string {
  const d = CHESTS[type];
  const rows = (['C', 'R', 'E', 'L'] as Rarity[])
    .map((r) => `<tr><td>${RNAME[r]}</td><td>${d.odds[r]}%</td></tr>`)
    .join('');
  return `<table class="odds" aria-label="Odds per card"><thead><tr><th>Rarity</th><th>Chance per card</th></tr></thead><tbody>${rows}</tbody></table>${
    d.guaranteedEpic ? '<p class="small">Includes at least 1 Epic or better.</p>' : ''
  }`;
}

export interface ChestInfoOpts {
  /** Rewarded ad halving allowed now (M5-5 caps); undefined = not offered. */
  canHalve?: boolean;
  /** Skip tickets owned (G8: skip the ad with a ticket). */
  tickets?: number;
  /** Ticket use allowed (not the first chest); tickets are not limited by ad caps. */
  canTicket?: boolean;
}

export function chestInfoHtml(s: SaveData, c: Chest, now: number, o: ChestInfoOpts = {}): string {
  const d = CHESTS[c.type];
  const st = chestState(c, now);
  const busy = s.meta.chests.some((x) => x !== c && x.unlockAt !== null && x.unlockAt > now);
  const rem = c.unlockAt === null ? d.unlockMs : Math.max(0, c.unlockAt - now);
  const skip = gemSkipCost(rem, d.gemSkip);
  const actions: string[] = [];
  if (st === 'ready') actions.push('<button class="btn primary" data-a="open">Open</button>');
  else {
    if (st === 'locked')
      actions.push(
        busy
          ? '<button class="btn" disabled>Another chest is unlocking</button>'
          : `<button class="btn primary" data-a="unlock">Start unlock · ${fmtDuration(d.unlockMs)}</button>`,
      );
    if (st === 'unlocking' && o.canHalve)
      actions.push('<button class="btn ad" data-a="halve">▶ Watch ad: ½ time</button>');
    if (st === 'unlocking' && o.canTicket && (o.tickets ?? 0) > 0)
      actions.push(
        `<button class="btn" data-a="ticket">🎟 Use ticket: ½ time (${o.tickets})</button>`,
      );
    actions.push(
      `<button class="btn" data-a="skip" ${s.gems < skip ? 'disabled' : ''}>Open now · 💎 ${skip}</button>`,
    );
  }
  const pityLeft = PITY_LEGENDARY - s.meta.pityLegendary;
  return `<div class="modal"><div class="card chest-info">
    <h2>${CICON[c.type]} ${d.name} chest</h2>
    <p>${chestCardCount(s, c.type)} cards · 🪙 ${d.coins[0]}${d.coins[1] !== d.coins[0] ? `–${d.coins[1]}` : ''}</p>
    ${st === 'unlocking' ? `<p class="timer">Ready in <b data-until="${c.unlockAt}">${fmtDuration(rem)}</b></p>` : ''}
    ${oddsTableHtml(c.type)}
    <p class="small">Legendary guaranteed within ${pityLeft} chest${pityLeft === 1 ? '' : 's'}. First Epic and Legendary are always new bees. Chests are earned only and never sold.</p>
    <div class="row">${actions.join('')}</div>
    <div class="row"><button class="btn" data-a="back">Back</button></div></div></div>`;
}

export function chestOpenHtml(r: ChestReward): string {
  const cards = r.cards
    .map((c) => {
      const d = beeDef(c.bee)!;
      return `<li class="card-drop r-${c.rarity}"><span>${d.icon}</span><b>${esc(d.name)}</b><small>${RNAME[c.rarity]} ×${c.count}${c.isNew ? ' · NEW' : ''}${c.overflowCoins ? ` · +🪙 ${c.overflowCoins}` : ''}</small></li>`;
    })
    .join('');
  return `<div class="modal"><div class="card chest-open">
    <h2>${CICON[r.type]} ${CHESTS[r.type].name} chest</h2>
    <ul class="card-drops">${cards}</ul>
    <p class="reward">+🪙 ${r.coins}</p>${r.pity ? '<p class="small">Pity Legendary!</p>' : ''}
    <div class="row"><button class="btn primary" data-a="collect">Collect</button></div></div></div>`;
}

/** Collection + loadout (Bees screen). */
export function beesHtml(s: SaveData, stage: number): string {
  const slots = unlockedSlots(stage);
  const slotHtml = s.meta.loadout
    .map((id, i) => {
      if (i >= slots)
        return `<li class="slot locked"><small>🔒 Stage ${SLOT_UNLOCK_STAGES[i]}</small></li>`;
      const d = id ? beeDef(id) : undefined;
      return d
        ? `<li class="slot"><button class="slot-btn" data-a="unequip:${i}" aria-label="Remove ${esc(d.name)}">${d.icon}<small>${esc(d.name)} L${s.meta.bees[id].level}</small></button></li>`
        : '<li class="slot empty"><small>Empty</small></li>';
    })
    .join('');
  const owned = BEES.filter((b) => (s.meta.bees[b.id]?.level ?? 0) > 0).length;
  const grid = BEES.map((b) => {
    const st = s.meta.bees[b.id];
    const lvl = st?.level ?? 0;
    if (lvl === 0)
      return `<li class="bee locked r-${b.rarity}"><span class="bee-icon">❔</span><b>${esc(b.name)}</b><small>${RNAME[b.rarity]} · drops from chests</small></li>`;
    const cost = upgradeCost(s, b.id);
    const max = lvl >= MAX_LEVEL[b.rarity];
    const can = !!cost && st.pollen >= cost.pollen && s.coins >= cost.coins;
    const up = max
      ? '<small>MAX</small>'
      : `<button class="btn small${can ? ' primary' : ''}" data-a="upgrade:${b.id}" ${can ? '' : 'disabled'}>⬆ ${st.pollen}/${cost!.pollen} · 🪙 ${cost!.coins}</button>`;
    const equipped = s.meta.loadout.includes(b.id);
    const eq =
      b.id === 'worker'
        ? '<small>Base shooter</small>'
        : equipped
          ? '<small>Equipped</small>'
          : slots > 0
            ? `<button class="btn small" data-a="equip:${b.id}">Equip</button>`
            : '';
    const pending = PENDING_EFFECTS.includes(b.id) ? ' <i>(effect coming soon)</i>' : '';
    return `<li class="bee r-${b.rarity}${can ? ' can-up' : ''}"><span class="bee-icon">${b.icon}</span><b>${esc(b.name)} L${lvl}</b>
      <small>${RNAME[b.rarity]} · ${esc(b.effect)}${pending}</small><span class="bee-act">${up}${eq}</span></li>`;
  }).join('');
  return `<div class="modal"><div class="card bees-screen">
    <h2>Bees <small>${owned}/${BEES.length} · power ${loadoutPower(s, stage)}</small></h2>
    <h3>Loadout</h3><ul class="loadout">${slotHtml}</ul>
    <ul class="bee-grid">${grid}</ul>
    <div class="row"><button class="btn primary" data-a="back">Back</button></div></div></div>`;
}

/** Hive base (4 rooms, one build at a time, Honey Store idle coins). */
export function hiveHtml(s: SaveData, now: number): string {
  const cap = roomCap(s);
  const rows = ROOM_IDS.map((id: RoomId) => {
    const r = ROOMS[id];
    const lvl = roomLevel(s, id);
    const b = s.meta.hive[id]?.building;
    const cost = roomUpgradeCost(s, id);
    const block = buildBlock(s, id, now);
    let act: string;
    if (b)
      act = `<span class="small">Building L${b.toLevel}: <b data-until="${b.endsAt}">${fmtDuration(b.endsAt - now)}</b></span>
        <button class="btn small" data-a="rush">Finish · 💎 ${gemSkipCost(b.endsAt - now)}</button>`;
    else if (!cost) act = '<small>MAX</small>';
    else
      act = `<button class="btn small${block ? '' : ' primary'}" data-a="build:${id}" ${block ? 'disabled' : ''}>⬆ L${lvl + 1} · 🪙 ${cost[0]} · ${fmtDuration(cost[1])}</button>${
        block === 'cap'
          ? `<small>Needs account level ${2 * (lvl + 1)}</small>`
          : block === 'busy'
            ? '<small>Builder busy</small>'
            : ''
      }`;
    return `<li class="room"><span class="room-icon">${r.icon}</span><b>${esc(r.name)} L${lvl}/${r.max}</b><small>${esc(r.effect)}</small><span class="room-act">${act}</span></li>`;
  }).join('');
  const honey = honeyPending(s, now);
  const lvl = playerLevel(s);
  return `<div class="modal"><div class="card hive-screen">
    <h2>Hive <small>account level ${lvl} · room cap ${cap}</small></h2>
    <ul class="rooms">${rows}</ul>
    ${roomLevel(s, 'honey') > 0 ? `<div class="row"><button class="btn" data-a="honey" ${honey ? '' : 'disabled'}>Collect honey · 🪙 ${honey}</button></div>` : ''}
    <div class="row"><button class="btn primary" data-a="back">Back</button></div></div></div>`;
}

export interface Goal {
  label: string;
  /** 0..1 */
  progress: number;
}

/**
 * M5-12 next goal: the nearest of (next loadout slot, next bee upgrade, next room build,
 * next account level). "Nearest" = highest completion below 100%; a goal already reachable
 * (progress 1) wins outright so the player sees what they can do now.
 */
export function nextGoal(s: SaveData, stage: number, now: number): Goal {
  const goals: Goal[] = [];
  const nextSlot = SLOT_UNLOCK_STAGES.find((n) => stage < n);
  if (nextSlot !== undefined) {
    const prev = [0, ...SLOT_UNLOCK_STAGES][SLOT_UNLOCK_STAGES.indexOf(nextSlot)];
    goals.push({
      label: `Loadout slot at stage ${nextSlot}`,
      progress: Math.min(1, (stage - prev) / (nextSlot - prev)),
    });
  }
  for (const b of BEES) {
    const st = s.meta.bees[b.id];
    const c = st && upgradeCost(s, b.id);
    if (!c) continue;
    const p = Math.min(1, st.pollen / c.pollen) * 0.5 + Math.min(1, s.coins / c.coins) * 0.5;
    goals.push({ label: `Upgrade ${b.name} to L${st.level + 1}`, progress: p });
  }
  for (const id of ROOM_IDS) {
    const c = roomUpgradeCost(s, id);
    if (!c || buildBlock(s, id, now) === 'cap' || buildBlock(s, id, now) === 'busy') continue;
    goals.push({
      label: `Build ${ROOMS[id].name} L${roomLevel(s, id) + 1}`,
      progress: Math.min(1, s.coins / c[0]),
    });
  }
  const lvl = playerLevel(s);
  const lo = xpForLevel(lvl);
  const hi = xpForLevel(lvl + 1);
  goals.push({ label: `Account level ${lvl + 1}`, progress: (s.meta.xp - lo) / (hi - lo) });
  goals.sort((a, b) => b.progress - a.progress);
  return goals[0];
}

export function goalBarHtml(g: Goal): string {
  const pct = Math.round(g.progress * 100);
  return `<div class="goal-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Next goal: ${esc(g.label)}">
    <small>Next goal: <b>${esc(g.label)}</b></small><span class="ch-bar"><span style="width:${pct}%"></span></span></div>`;
}

/** Session-start away doubler (ad-placements.md #10). */
export function awayOfferHtml(coins: number): string {
  return `<div class="modal"><div class="card offer away-offer">
    <h2>🍯 Welcome back!</h2><p>Your honey room made <b>🪙 ${coins}</b> while you were away.</p>
    <div class="row"><button class="btn ad primary" data-a="away:double">▶ Watch ad: 🪙 ${coins * 2}</button>
    <button class="btn" data-a="away:collect">Collect 🪙 ${coins}</button></div></div></div>`;
}

/** Home button for the daily rewarded card pack (ad-placements.md #7). */
export const dailyPackButtonHtml = () =>
  '<button class="btn ad" data-a="dailypack">▶ Free card pack (Wood odds)</button>';
