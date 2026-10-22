/**
 * Feedback round 4 #2 (Mohit, 2026-10-22: "many table layouts don't look good"): shared
 * game-style building blocks that replace table-like lists. Icon + value reward chips, card
 * rows with big tap targets, toggle rows with a switch, medal rank rows and shop product
 * cards. Pure HTML builders, so they are testable without a DOM.
 */
import type { SkuInfo } from '../platform/platform';

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Splits a reward label ("🪙 150", "🎁 Gold") into its icon and its text. */
export function splitLabel(label: string): [icon: string, text: string] {
  const i = label.indexOf(' ');
  return i > 0 ? [label.slice(0, i), label.slice(i + 1)] : [label, ''];
}

/** A reward chip: big icon over a bold value. `state` dims (claimed) or locks it. */
export function rewardChip(label: string, state: '' | 'claimed' | 'locked' = ''): string {
  const [icon, text] = splitLabel(label);
  const mark =
    state === 'claimed'
      ? '<i class="rw-mark">✓</i>'
      : state === 'locked'
        ? '<i class="rw-mark">🔒</i>'
        : '';
  return `<span class="rw${state ? ' ' + state : ''}"><span class="rw-icon">${icon}</span><b>${esc(text)}</b>${mark}</span>`;
}

/** A settings toggle row: icon, label and an on/off switch; the whole row is the tap target. */
export function toggleRow(a: string, icon: string, label: string, on: boolean, note = ''): string {
  return `<button class="toggle-row" data-a="${a}" role="switch" aria-checked="${on}">
    <span class="tg-icon">${icon}</span><span class="tg-label">${esc(label)}${note ? `<small>${esc(note)}</small>` : ''}</span>
    <span class="switch${on ? ' on' : ''}"><i></i></span></button>`;
}

export interface RankRowModel {
  rank: number;
  name: string;
  score: number;
  you: boolean;
}

const MEDAL = ['🥇', '🥈', '🥉'];

/** Leaderboard row: medal (top 3) or rank badge, name, trophy score; the player highlighted. */
export function rankRow(r: RankRowModel): string {
  const badge =
    r.rank <= 3
      ? `<span class="rk medal">${MEDAL[r.rank - 1]}</span>`
      : `<span class="rk">#${r.rank}</span>`;
  return `<li class="rank${r.you ? ' you' : ''}">${badge}<span class="rn">${esc(r.name)}</span><span class="rs">🏆 ${r.score}</span></li>`;
}

const SKU_ICON: Record<string, string> = {
  no_ads: '🚫',
  starter_pack: '🎁',
  gems_small: '💎',
  gems_medium: '💎',
  gems_large: '💎',
  skip_tickets_10: '🎟️',
  season_pass: '👑',
};

/** What a SKU gives, in one short line (the card's subtitle). */
export function skuBlurb(s: Pick<SkuInfo, 'id' | 'grants'>): string {
  const g = s.grants;
  const parts: string[] = [];
  if (g.coins) parts.push(`🪙 ${g.coins}`);
  if (g.gems) parts.push(`💎 ${g.gems}`);
  if (g.skipTickets) parts.push(`🎟️ ${g.skipTickets} tickets`);
  if (g.skin) parts.push('🎨 bee skin');
  if (g.seasonPremium) parts.push('Premium pass track');
  if (!parts.length && g.noAds) parts.push('No forced ads, forever');
  return parts.join(' · ');
}

/** Shop product card: icon tile, title + what you get, price pill. One big tap target. */
export function shopItem(s: Pick<SkuInfo, 'id' | 'title' | 'grants'>, price: string): string {
  const big = s.id === 'gems_large' ? ' xl' : s.id === 'gems_medium' ? ' lg' : '';
  return `<li><button class="shop-item" data-a="buy:${s.id}">
    <span class="si-icon${big}">${SKU_ICON[s.id] ?? '🛍️'}</span>
    <span class="si-body"><b>${esc(s.title)}</b><small>${skuBlurb(s)}</small></span>
    <span class="si-price">${esc(price)}</span></button></li>`;
}
