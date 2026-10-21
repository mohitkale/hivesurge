import { parseLevel } from '../levels/parse';
import { SIM_DT, World } from '../sim/world';

/**
 * Admin level validation: the game's parser plus two headless sim runs (idle and a
 * centre-firing bot), the same idea as the M2-5 bot check. Errors block saving; notes warn.
 */
export function checkLevel(raw: unknown, expectId?: string): { errors: string[]; notes: string[] } {
  const errors: string[] = [];
  const notes: string[] = [];
  let level;
  try {
    level = parseLevel(raw);
  } catch (e) {
    return { errors: [(e as Error).message], notes };
  }
  if (expectId && level.id !== expectId) errors.push(`id must stay "${expectId}"`);
  const run = (firing: boolean) => {
    const w = new World(level);
    const max = Math.ceil((level.timeLimit + 5) / SIM_DT);
    for (let i = 0; i < max && w.outcome === 'playing'; i++)
      w.step({ aimX: 0, firing, queen: firing });
    return w.outcome;
  };
  try {
    const idle = run(false);
    const centre = run(true);
    if (idle === 'won') notes.push('Warning: an idle player wins this level (too easy).');
    notes.push(`Bot check: idle → ${idle}, centre fire → ${centre}.`);
  } catch (e) {
    errors.push(`sim crashed: ${(e as Error).message}`);
  }
  return { errors, notes };
}
