import { worldName, type EarnedRewards } from './homeMap';

/**
 * Round 3 (2026-10-16, Mohit playtest): a real hyper-casual home screen shown on every launch
 * and after every level, before the game. Pure model + HTML so it is testable without a DOM.
 * Challenges and rankings are LOCAL MOCK data (no backend yet); the UI labels them so.
 */

export interface ModeTile {
  id: 'story' | 'arena' | 'explorer';
  icon: string;
  title: string;
  desc: string;
  /** Campaign level that unlocks the mode (1 = always open). */
  unlockLevel: number;
  /** Built yet? Arena / Explorer are "coming soon" even once the level is reached. */
  built: boolean;
}

export const MODES: ModeTile[] = [
  { id: 'story', icon: '🗺️', title: 'Story', desc: 'Campaign map', unlockLevel: 1, built: true },
  {
    id: 'arena',
    icon: '⚔️',
    title: 'Arena',
    desc: 'Swarm vs swarm',
    unlockLevel: 10,
    built: false,
  },
  {
    id: 'explorer',
    icon: '🧭',
    title: 'Explorer',
    desc: 'Wild meadows',
    unlockLevel: 20,
    built: false,
  },
];

export type ModeState = 'open' | 'locked' | 'soon';

/** Open = playable; locked = level not reached; soon = level reached, mode not built yet. */
export function modeState(m: ModeTile, levelNo: number): ModeState {
  if (levelNo < m.unlockLevel) return 'locked';
  return m.built ? 'open' : 'soon';
}

export interface CollectionItem {
  kind: 'cannon' | 'bee';
  id: string;
  name: string;
  icon: string;
  owned: boolean;
  /** How to get it when not owned. */
  unlock: string;
}

/** Cannon skins are placeholders until art lands (round 3: "placeholders ok"). */
export const CANNON_SKINS: { id: string; name: string; icon: string; unlockLevel: number }[] = [
  { id: 'cannon-classic', name: 'Honey Pot', icon: '🍯', unlockLevel: 1 },
  { id: 'cannon-comb', name: 'Honeycomb', icon: '🔶', unlockLevel: 8 },
  { id: 'cannon-royal', name: 'Royal Jelly', icon: '👑', unlockLevel: 15 },
  { id: 'cannon-frost', name: 'Frost Bloom', icon: '❄️', unlockLevel: 25 },
];

export function collection(
  levelNo: number,
  bees: { id: string; name: string; owned: boolean; unlock: string | null }[],
): CollectionItem[] {
  return [
    ...CANNON_SKINS.map((c) => ({
      kind: 'cannon' as const,
      id: c.id,
      name: c.name,
      icon: c.icon,
      owned: levelNo >= c.unlockLevel,
      unlock: `Level ${c.unlockLevel}`,
    })),
    ...bees.map((b) => ({
      kind: 'bee' as const,
      id: b.id,
      name: b.name,
      icon: '🐝',
      owned: b.owned,
      unlock: b.unlock ?? 'Shop',
    })),
  ];
}

export interface Challenge {
  id: string;
  icon: string;
  title: string;
  goal: number;
  progress: number;
  reward: string;
  /** 'open' today; 'upcoming' unlocks at the next local midnight. */
  state: 'open' | 'upcoming';
}

const CHALLENGE_POOL: Omit<Challenge, 'progress' | 'state' | 'id'>[] = [
  { icon: '🏆', title: 'Win 3 levels', goal: 3, reward: '🪙 60' },
  { icon: '⭐', title: 'Earn 5 stars', goal: 5, reward: '💎 2' },
  { icon: '✖️', title: 'Pass 10 x-gates', goal: 10, reward: '🪙 40' },
  { icon: '👑', title: 'Launch the Queen 4 times', goal: 4, reward: '🪙 50' },
  { icon: '🛡️', title: 'Win without a hive hit', goal: 1, reward: '💎 3' },
  { icon: '🐝', title: 'Fire 500 bees', goal: 500, reward: '🪙 80' },
];

/** Day number since epoch for a local YYYY-MM-DD string (deterministic rotation). */
function dayIndex(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
}

/**
 * Daily challenges (local mock): three open today, two upcoming tomorrow, rotated by date.
 * `progress` is a mock from what the save knows (battles played), clamped to the goal.
 */
export function dailyChallenges(day: string, battles: number): Challenge[] {
  const n = CHALLENGE_POOL.length;
  const di = dayIndex(day);
  const pick = (k: number, state: Challenge['state']): Challenge => {
    const c = CHALLENGE_POOL[(((di * 3 + k) % n) + n) % n];
    const progress = state === 'open' ? Math.min(c.goal, (battles * (k + 1)) % (c.goal + 1)) : 0;
    return { ...c, id: `${day}-${k}`, progress, state };
  };
  return [
    pick(0, 'open'),
    pick(1, 'open'),
    pick(2, 'open'),
    pick(3, 'upcoming'),
    pick(4, 'upcoming'),
  ];
}

export interface RankRow {
  rank: number;
  name: string;
  score: number;
  you: boolean;
}

const MOCK_NAMES = [
  'BuzzQueen',
  'HoneyDrip',
  'Stingray77',
  'PollenPal',
  'WaxWing',
  'CombChamp',
  'NectarNinja',
];

/** Player score for the mock board: stars x 100 + level x 25. */
export function playerScore(stars: number, levelNo: number): number {
  return stars * 100 + levelNo * 25;
}

/** Local mock leaderboard: fixed bots + the player, sorted, top `size` (player always shown). */
export function mockLeaderboard(stars: number, levelNo: number, size = 5): RankRow[] {
  const you = playerScore(stars, levelNo);
  const rows = MOCK_NAMES.map((name, i) => ({ name, score: 2400 - i * 330, you: false }));
  rows.push({ name: 'You', score: you, you: true });
  rows.sort((a, b) => b.score - a.score || (a.you ? -1 : 1));
  const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));
  const top = ranked.slice(0, size);
  if (!top.some((r) => r.you)) top[size - 1] = ranked.find((r) => r.you)!;
  return top;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export interface HomeModel {
  levelNo: number;
  stars: number;
  coins: number;
  gems: number;
  earned: EarnedRewards | null;
  collection: CollectionItem[];
  challenges: Challenge[];
  ranks: RankRow[];
  /** M5-4 / M5-12: next-goal bar, chest row and meta buttons (prebuilt HTML). */
  meta?: string;
}

export function homeHtml(o: HomeModel): string {
  const modes = MODES.map((m) => {
    const st = modeState(m, o.levelNo);
    const badge =
      st === 'open'
        ? `<span class="mode-badge play">▶ Play</span>`
        : st === 'soon'
          ? `<span class="mode-badge">Coming soon</span>`
          : `<span class="mode-badge">🔒 Level ${m.unlockLevel}</span>`;
    return `<button class="mode-tile ${m.id} ${st}" data-a="mode:${m.id}" ${st === 'open' ? '' : 'aria-disabled="true"'}
      aria-label="${m.title}${st === 'open' ? '' : st === 'soon' ? ', coming soon' : `, unlocks at level ${m.unlockLevel}`}">
      <span class="mode-icon">${m.icon}</span><b>${m.title}</b><small>${m.desc}</small>${badge}</button>`;
  }).join('');
  const coll = o.collection
    .map(
      (
        c,
      ) => `<li class="coll-item ${c.kind}${c.owned ? ' owned' : ' locked'}" title="${esc(c.name)}">
        <span class="coll-icon">${c.owned ? c.icon : '🔒'}</span><small>${esc(c.name)}</small>
        ${c.owned ? '' : `<i>${esc(c.unlock)}</i>`}</li>`,
    )
    .join('');
  const owned = o.collection.filter((c) => c.owned).length;
  const ch = (c: Challenge) => `<li class="challenge ${c.state}">
      <span class="ch-icon">${c.icon}</span><span class="ch-body"><b>${esc(c.title)}</b>
      ${
        c.state === 'open'
          ? `<span class="ch-bar"><span style="width:${Math.round((100 * c.progress) / c.goal)}%"></span></span><small>${c.progress}/${c.goal}</small>`
          : `<small>Opens tomorrow</small>`
      }</span><span class="ch-reward">${c.reward}</span></li>`;
  const ranks = o.ranks
    .map(
      (r) =>
        `<li class="rank${r.you ? ' you' : ''}"><span class="rk">#${r.rank}</span><span class="rn">${esc(r.name)}</span><span class="rs">${r.score}</span></li>`,
    )
    .join('');
  const e = o.earned;
  const earned = e
    ? `<div class="earned ${e.won ? 'won' : 'lost'}" role="status">
        <b>${e.won ? `Level ${e.levelNo} cleared!` : `Level ${e.levelNo}: nest survived`}</b>
        <span>+🪙 ${e.coins}</span>${e.won ? `<span>+${e.stars} ⭐</span>` : ''}${e.gems > 0 ? `<span>+💎 ${e.gems}</span>` : ''}${e.meta ? `<span>${esc(e.meta)}</span>` : ''}
      </div>`
    : '';
  return `<div class="modal home home-r3"><div class="home-card home-main">
    <div class="wallet"><span>🪙 ${o.coins}</span><span>💎 ${o.gems}</span><button class="home-gear" data-a="settings" aria-label="Settings">⚙️</button></div>
    <div class="title-logo home-logo"><span class="logo-bee">🐝</span>HIVE<br>SURGE</div>
    <div class="progress-strip" aria-label="Progress">
      <span class="pchip">LV <b>${o.levelNo}</b></span><span class="pchip">${worldName(o.levelNo)}</span><span class="pchip">⭐ <b>${o.stars}</b></span>
    </div>
    ${earned}
    ${o.meta ?? ''}
    <div class="row"><button class="btn primary play-big" data-a="play">▶ PLAY · LEVEL ${o.levelNo}</button></div>
    <section class="home-sec"><h3>Modes</h3><div class="mode-grid">${modes}</div></section>
    <section class="home-sec"><h3>Collection <small>${owned}/${o.collection.length}</small></h3>
      <ul class="coll-strip">${coll}</ul>
      <div class="row"><button class="btn" data-a="skin">Bee skins</button><button class="btn" data-a="shop">Shop</button></div></section>
    <section class="home-sec"><h3>Daily challenges <small>resets 00:00 UTC</small></h3>
      <ul class="ch-list">${o.challenges
        .filter((c) => c.state === 'open')
        .map(ch)
        .join('')}</ul>
      ${
        o.challenges.some((c) => c.state === 'upcoming')
          ? `<h4>Upcoming</h4><ul class="ch-list">${o.challenges
              .filter((c) => c.state === 'upcoming')
              .map(ch)
              .join('')}</ul>`
          : ''
      }</section>
    <section class="home-sec"><h3>Rankings <small class="mock-tag">mock · local only, not online</small></h3>
      <ol class="rank-list">${ranks}</ol></section>
  </div></div>`;
}
