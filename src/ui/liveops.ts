import {
  DAILY_BONUS_PASS_XP,
  dailyTargets,
  eventCalendar,
  eventLevelCount,
  eventRules,
  freeReward,
  passTier,
  premiumRewards,
  progressOf,
  rewardLabel,
  TIERS,
  WEEKLY_TARGETS,
  winStreakBonus,
  type TargetDef,
} from '../meta/liveops';
import type { LiveEvent } from '../platform/remoteConfig';
import type { SaveData } from '../platform/save';
import type { LiveCtx } from '../meta/liveGame';
import type { Challenge } from './home';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmtLeft = (ms: number) => {
  const h = Math.max(0, Math.floor(ms / 3_600_000));
  return h >= 24
    ? `${Math.floor(h / 24)}d ${h % 24}h`
    : `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
};

/** M7-3 (carry-over e): the home "Daily challenges" are the real daily targets now. */
export function homeChallenges(s: SaveData): Challenge[] {
  const L = s.meta.liveops;
  const daily = dailyTargets(L).map((t, i) => ({
    id: t.id,
    icon: t.icon,
    title: `${t.title} (${t.goal})`,
    goal: t.goal,
    progress: progressOf(L.daily.counts, t),
    reward: L.daily.claimed.includes(i) ? '✅' : rewardLabel(t.reward),
    state: 'open' as const,
  }));
  const weekly = WEEKLY_TARGETS.slice(0, 2).map((t, i) => ({
    id: t.id,
    icon: t.icon,
    title: `Weekly: ${t.title} (${t.goal})`,
    goal: t.goal,
    progress: progressOf(L.weekly.counts, t),
    reward: L.weekly.claimed.includes(i) ? '✅' : rewardLabel(t.reward),
    state: 'open' as const,
  }));
  return [...daily, ...weekly];
}

/** Home banner: the running event (or the next one), plus streak flame. */
export function liveBannerHtml(s: SaveData, ctx: LiveCtx, next: LiveEvent | null): string {
  const L = s.meta.liveops;
  const flame =
    L.winStreak >= 3
      ? `<span class="pchip streak">🔥 ${L.winStreak} wins · +${Math.round((winStreakBonus(L.winStreak) - 1) * 100)}% coins</span>`
      : '';
  const ev = ctx.event;
  const event = ev
    ? `<div class="event-banner" data-event="${esc(ev.id)}"><b>🎪 ${esc(ev.name ?? ev.id)}</b>
        <small>${L.event.cleared}/${eventLevelCount(ev)} levels · ${L.event.points} pts · ends in ${fmtLeft(ev.end - ctx.now)}</small>
        <button class="btn small primary" data-a="event:play">Play event</button></div>`
    : next
      ? `<div class="event-banner soon"><b>🎪 Next: ${esc(next.name ?? next.id)}</b><small>starts in ${fmtLeft(next.start - ctx.now)}</small></div>`
      : '';
  return `${event}<div class="row">${flame}<button class="btn" data-a="liveops">🎯 Targets &amp; Pass</button></div>`;
}

function targetRow(
  t: TargetDef,
  i: number,
  counts: Record<string, number>,
  claimed: number[],
  kind: string,
  canReroll: boolean,
): string {
  const p = progressOf(counts, t);
  const done = claimed.includes(i);
  const act = done
    ? '<span class="claimed">✅</span>'
    : p >= t.goal
      ? `<button class="btn small primary" data-a="claim:${kind}:${i}">Claim ${rewardLabel(t.reward)}</button>`
      : `<small>${rewardLabel(t.reward)}</small>${canReroll ? ` <button class="btn small" data-a="reroll:${i}" aria-label="Swap this target">↻</button>` : ''}`;
  return `<li class="challenge"><span class="ch-icon">${t.icon}</span><span class="ch-body"><b>${esc(t.title)}</b>
    <span class="ch-bar"><span style="width:${Math.round((100 * p) / t.goal)}%"></span></span><small>${p}/${t.goal}</small></span><span class="ch-reward">${act}</span></li>`;
}

/** The Targets & Pass screen: daily, weekly, event milestones, season pass tiers. */
/** M7 events calendar (remote config `events`): running event + the next ones, with dates. */
export function calendarHtml(events: LiveEvent[] | undefined, now: number): string {
  const rows = eventCalendar(events, now);
  if (!rows.length) return '<p class="small">No events scheduled right now.</p>';
  const day = (t: number) =>
    new Date(t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return `<ul class="calendar">${rows
    .map(
      (r) =>
        `<li class="cal-row ${r.state}" data-event="${esc(r.event.id)}"><b>${esc(r.event.name ?? r.event.id)}</b>
        <small>${r.state === 'live' ? `on now · ends in ${fmtLeft(r.event.end - now)}` : `${day(r.event.start)} → ${day(r.event.end)} · starts in ${fmtLeft(r.event.start - now)}`}</small>
        <small class="twist">${esc(r.twist)}</small></li>`,
    )
    .join('')}</ul>`;
}

export function liveopsHtml(
  s: SaveData,
  ctx: LiveCtx,
  passPrice: string | null,
  events?: LiveEvent[],
): string {
  const L = s.meta.liveops;
  const daily = dailyTargets(L)
    .map((t, i) => targetRow(t, i, L.daily.counts, L.daily.claimed, 'daily', L.daily.rerolled < 0))
    .join('');
  const bonus = L.daily.bonusClaimed
    ? '<p class="small">Daily bonus claimed ✅</p>'
    : L.daily.claimed.length >= 3
      ? `<div class="row"><button class="btn primary" data-a="claim:bonus">Daily bonus: 🎁 Wood chest + ${DAILY_BONUS_PASS_XP} pass XP</button></div>`
      : `<p class="small">Finish all 3 for a Wood chest + ${DAILY_BONUS_PASS_XP} pass XP</p>`;
  const weekly = WEEKLY_TARGETS.map((t, i) =>
    targetRow(t, i, L.weekly.counts, L.weekly.claimed, 'weekly', false),
  ).join('');
  const ev = ctx.event;
  const milestones = ev
    ? (eventRules(ev).milestones ?? [])
        .map(([pts, r], i) => {
          const st = L.event.claimed.includes(i)
            ? '✅'
            : L.event.points >= pts
              ? `<button class="btn small primary" data-a="claim:event:${i}">Claim</button>`
              : `${L.event.points}/${pts}`;
          return `<li class="milestone"><b>${pts} pts</b> ${rewardLabel(r)} <span>${st}</span></li>`;
        })
        .join('')
    : '';
  const se = ctx.season;
  let pass = '<p class="small">No season running right now.</p>';
  if (se) {
    const tier = passTier(L.season.xp, se.xpPerTier);
    const into = L.season.xp - tier * se.xpPerTier;
    const rows: string[] = [];
    for (let t = 1; t <= TIERS; t++) {
      const reached = t <= tier;
      const f = L.season.claimedFree.includes(t)
        ? '✅'
        : reached
          ? `<button class="btn small" data-a="tier:free:${t}">${freeReward(t).map(rewardLabel).join(' ')}</button>`
          : `<small>${freeReward(t).map(rewardLabel).join(' ')}</small>`;
      const pr = premiumRewards(t).map(rewardLabel).join(' + ');
      const p = L.season.claimedPremium.includes(t)
        ? '✅'
        : reached && s.meta.seasonPremium
          ? `<button class="btn small primary" data-a="tier:premium:${t}">${pr}</button>`
          : `<small>${s.meta.seasonPremium ? '' : '🔒 '}${pr}</small>`;
      rows.push(
        `<tr class="${reached ? 'reached' : ''}"><th>${t}</th><td>${f}</td><td>${p}</td></tr>`,
      );
    }
    const buy =
      !s.meta.seasonPremium && passPrice
        ? `<div class="row"><button class="btn primary" data-a="buy:season_pass">Season Pass ${esc(passPrice)} (sandbox): fixed, named rewards</button></div>`
        : '';
    pass = `<p>Tier <b>${tier}</b>/${TIERS} · ${into}/${se.xpPerTier} XP · ends in ${fmtLeft(se.start + se.days * 86_400_000 - ctx.now)}</p>${buy}
      <div class="pass-scroll"><table class="pass"><thead><tr><th>Tier</th><th>Free</th><th>Premium</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  }
  return `<div class="modal"><div class="card liveops-screen">
    <h2>Targets &amp; Pass</h2>
    <h3>Today</h3><ul class="ch-list">${daily}</ul>${bonus}
    <h3>This week</h3><ul class="ch-list">${weekly}</ul>
    ${ev ? `<h3>🎪 ${esc(ev.name ?? ev.id)} · ${L.event.points} pts</h3><ul class="milestones">${milestones}</ul>` : ''}
    <h3>📅 Events calendar</h3>${calendarHtml(events, ctx.now)}
    <h3>Season pass</h3>${pass}
    <div class="row"><button class="btn primary" data-a="back">Back</button></div></div></div>`;
}
