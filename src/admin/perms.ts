/** Admin roles and permissions (docs/design/admin-m6.md). The server enforces the same table. */
export type Role = 'viewer' | 'support' | 'liveops' | 'owner';
export const ROLES: Role[] = ['viewer', 'support', 'liveops', 'owner'];

export type Action =
  'read' | 'grant' | 'reset' | 'publish' | 'publishOdds' | 'rollback' | 'saveLevel';

const TABLE: Record<Action, Role[]> = {
  read: ['viewer', 'support', 'liveops', 'owner'],
  grant: ['support', 'owner'],
  reset: ['support', 'owner'],
  publish: ['liveops', 'owner'],
  publishOdds: ['owner'],
  rollback: ['owner'],
  saveLevel: ['liveops', 'owner'],
};

export const can = (role: Role | null, a: Action): boolean => !!role && TABLE[a].includes(role);

/** Per-grant caps; support is capped, owner has a sanity ceiling only. */
export const GRANT_CAPS: Record<Role, { coins: number; gems: number }> = {
  viewer: { coins: 0, gems: 0 },
  liveops: { coins: 0, gems: 0 },
  support: { coins: 10_000, gems: 500 },
  owner: { coins: 1_000_000, gems: 100_000 },
};

export const MIN_REASON = 5;

/** Mirrors the server checks so the UI explains a refusal before the RPC does. */
export function grantProblem(
  role: Role | null,
  coins: number,
  gems: number,
  reason: string,
): string | null {
  if (!can(role, 'grant')) return 'forbidden: your role cannot grant currency';
  if (
    !Number.isInteger(coins) ||
    !Number.isInteger(gems) ||
    coins < 0 ||
    gems < 0 ||
    coins + gems === 0
  )
    return 'grant must be a positive whole number';
  const cap = GRANT_CAPS[role!];
  if (coins > cap.coins || gems > cap.gems)
    return `over the ${role} cap (${cap.coins} coins / ${cap.gems} gems)`;
  if (reason.trim().length < MIN_REASON) return `reason (min ${MIN_REASON} chars) required`;
  return null;
}

export const maskEmail = (email: string | null, role: Role | null): string | null =>
  !email ? null : role === 'viewer' ? `${email[0]}***@${email.split('@')[1] ?? ''}` : email;
