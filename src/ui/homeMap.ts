import { bandTheme } from '../art/biomes';
import { campaignLevel, worldBand } from '../levels/campaign';

/**
 * Feedback 2026-10-15: home / map screen between levels (typical hyper-casual loop:
 * result → map with progress + rewards → Play → boost pick → battle). Pure model + HTML.
 */
export interface MapNode {
  /** 1-based level number. */
  no: number;
  name: string;
  stars: number;
  state: 'done' | 'current' | 'locked';
  boss: boolean;
}

/** Nodes shown on the map path: up to `before` cleared levels, the current one, `after` locked. */
export function mapNodes(
  currentIndex: number,
  bestStars: Record<string, number>,
  before = 2,
  after = 3,
): MapNode[] {
  const out: MapNode[] = [];
  for (let i = Math.max(0, currentIndex - before); i <= currentIndex + after; i++) {
    const l = campaignLevel(i);
    out.push({
      no: i + 1,
      name: l.name,
      stars: bestStars[l.id] ?? 0,
      state: i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'locked',
      boss: !!l.bossPhases,
    });
  }
  return out;
}

export function totalStars(bestStars: Record<string, number>): number {
  return Object.values(bestStars).reduce((n, s) => n + (s > 0 ? s : 0), 0);
}

/** What the last battle paid, shown on the map once. */
export interface EarnedRewards {
  levelNo: number;
  won: boolean;
  coins: number;
  /** Stars earned this battle (0..3) and how many of them are new bests. */
  stars: number;
  newStars: number;
  gems: number;
}

/** Gems per newly earned star (first time a star is reached on a level). */
export const GEMS_PER_NEW_STAR = 1;

/** New-best stars and the gem bonus they pay. */
export function starGain(prevBest: number, stars: number): { newStars: number; gems: number } {
  const newStars = Math.max(0, stars - prevBest);
  return { newStars, gems: newStars * GEMS_PER_NEW_STAR };
}

export function worldName(levelNo: number): string {
  return bandTheme(worldBand(levelNo))?.name ?? 'Meadow';
}

const starStr = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

export function mapHtml(o: {
  nodes: MapNode[];
  coins: number;
  gems: number;
  stars: number;
  earned: EarnedRewards | null;
  current: MapNode;
}): string {
  // Path drawn top (future) to bottom (past), like climbing a map.
  const path = [...o.nodes]
    .reverse()
    .map(
      (
        n,
        i,
      ) => `<li class="map-node ${n.state}${n.boss ? ' boss' : ''}" style="--o:${i % 2 ? 1 : -1}"
        aria-label="Level ${n.no}${n.state === 'locked' ? ', locked' : ''}${n.state === 'done' ? `, ${n.stars} of 3 stars` : ''}">
        <span class="map-dot">${n.state === 'locked' ? '🔒' : n.boss ? '👑' : n.no}</span>
        <span class="map-meta"><b>${n.state === 'locked' && !n.boss ? `Level ${n.no}` : n.name}</b>
        ${n.state === 'done' ? `<i class="map-stars">${starStr(n.stars)}</i>` : n.state === 'current' ? '<i>Next</i>' : ''}</span></li>`,
    )
    .join('');
  const e = o.earned;
  const earned = e
    ? `<div class="earned ${e.won ? 'won' : 'lost'}" role="status">
        <b>${e.won ? `Level ${e.levelNo} cleared!` : `Level ${e.levelNo}: nest survived`}</b>
        <span>+🪙 ${e.coins}</span>${e.won ? `<span>+${e.stars} ⭐</span>` : ''}${e.gems > 0 ? `<span>+💎 ${e.gems}</span>` : ''}
      </div>`
    : '';
  return `<div class="modal home"><div class="home-card">
    <div class="wallet"><span>🪙 ${o.coins}</span><span>💎 ${o.gems}</span><span>⭐ ${o.stars}</span></div>
    <div class="title-logo small-logo">HIVE SURGE</div>
    <p class="world-name">${worldName(o.current.no)}</p>
    ${earned}
    <ol class="map-path">${path}</ol>
    <div class="row"><button class="btn primary play-big" data-a="play">▶ PLAY · LEVEL ${o.current.no}</button></div>
    <div class="row"><button class="btn" data-a="shop">Shop</button><button class="btn" data-a="skin">Skins</button><button class="btn" data-a="settings">Settings</button></div>
  </div></div>`;
}
