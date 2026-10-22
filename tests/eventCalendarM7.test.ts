import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { eventCalendar, ruleSummary } from '../src/meta/liveops';
import { calendarHtml } from '../src/ui/liveops';
import type { LiveEvent } from '../src/platform/remoteConfig';

const H = 3_600_000;
const ev = (id: string, start: number, end: number, rules = {}): LiveEvent => ({
  id,
  name: id,
  start,
  end,
  rules,
});

describe('M7 events calendar', () => {
  it('lists the running event then upcoming ones; drops ended and broken rows', () => {
    const now = 100 * H;
    const rows = eventCalendar(
      [
        ev('later', 200 * H, 260 * H),
        ev('ended', 10 * H, 50 * H),
        ev('now', 90 * H, 120 * H, { onlyX3: true }),
        ev('next', 130 * H, 150 * H),
        ev('broken', 300 * H, 290 * H),
      ],
      now,
    );
    expect(rows.map((r) => [r.event.id, r.state])).toEqual([
      ['now', 'live'],
      ['next', 'soon'],
      ['later', 'soon'],
    ]);
    expect(rows[0].twist).toBe('Only ×3 gates count');
    expect(eventCalendar(undefined, now)).toEqual([]);
  });

  it('rule summaries are plain language (no new art needed)', () => {
    expect(ruleSummary({ gateAdd: 1, waveMul: 1.3 })).toBe('Gates +1 · Waves ×1.3');
    expect(ruleSummary({ hornetShare: 0.5 })).toBe('50% hornets');
    expect(ruleSummary({})).toBe('Bonus event levels');
  });

  it('renders the shipped remote-config calendar, escaping names', () => {
    const rc = JSON.parse(readFileSync('public/remote-config.json', 'utf8')) as {
      events: LiveEvent[];
    };
    const first = rc.events[0];
    const html = calendarHtml(rc.events, first.start + H);
    expect(html).toContain(`data-event="${first.id}"`);
    expect(html).toContain('on now');
    expect(calendarHtml([ev('<x>', 0, 10 * H)], H)).not.toContain('<x>');
    expect(calendarHtml([], 0)).toContain('No events scheduled');
  });
});
