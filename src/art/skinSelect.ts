import { SKINS, type BeeSkin } from './skins';

/** Skins every player has, before any purchase. */
export const FREE_SKINS = ['classic'] as const;

/** Skins the player can pick: free ones + owned ids that have art (unknown ids are ignored). */
export function ownedSkins(owned: readonly string[]): BeeSkin[] {
  const ids = new Set<string>([...FREE_SKINS, ...owned]);
  return SKINS.filter((s) => ids.has(s.id));
}

/** The skin to render: the selection if it is owned and has art, else 'classic'. */
export function resolveSkin(selected: string, owned: readonly string[]): BeeSkin {
  const list = ownedSkins(owned);
  return list.find((s) => s.id === selected) ?? list.find((s) => s.id === 'classic')!;
}
