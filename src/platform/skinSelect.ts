/**
 * Equipped bee skin (QA M2-19a). Pure so it is unit-testable; kept free of three.js so the
 * title screen can use it without pulling in geometry code. `known` is the list of skin ids
 * defined in src/art/skins.ts.
 */
export interface SkinState {
  skins: string[];
  equippedSkin: string;
}

export const CLASSIC = 'classic';

/** The skin to render: the equipped one if owned and defined, else classic. */
export function equippedSkinId(s: SkinState, known: readonly string[]): string {
  const id = s.equippedSkin;
  return id && s.skins.includes(id) && known.includes(id) ? id : CLASSIC;
}

/** Skins the player can pick: classic first, then owned skins that exist in the catalog. */
export function selectableSkins(s: SkinState, known: readonly string[]): string[] {
  return [CLASSIC, ...s.skins.filter((id) => id !== CLASSIC && known.includes(id))];
}

/** Title-screen toggle: equip the next selectable skin (wraps back to classic). */
export function cycleSkin(s: SkinState, known: readonly string[]): string {
  const list = selectableSkins(s, known);
  const next = list[(list.indexOf(equippedSkinId(s, known)) + 1) % list.length];
  s.equippedSkin = next === CLASSIC ? '' : next;
  return next;
}

/** Skin picker (PR 069): equip `id` if it is selectable; returns the skin now rendered. */
export function equipSkin(s: SkinState, id: string, known: readonly string[]): string {
  if (selectableSkins(s, known).includes(id)) s.equippedSkin = id === CLASSIC ? '' : id;
  return equippedSkinId(s, known);
}

export interface PickerEntry {
  id: string;
  owned: boolean;
  /** Where a locked skin comes from (e.g. 'Starter Pack'); null when owned. */
  unlock: string | null;
}

/**
 * Picker rows (PR 069): classic + owned skins (equippable), then skins that a shop SKU grants
 * but the player does not own yet (shown locked). `sources` maps skin id -> SKU title.
 */
export function pickerEntries(
  s: SkinState,
  known: readonly string[],
  sources: Readonly<Record<string, string>>,
): PickerEntry[] {
  const owned = selectableSkins(s, known);
  const locked = Object.keys(sources).filter((id) => known.includes(id) && !owned.includes(id));
  return [
    ...owned.map((id) => ({ id, owned: true, unlock: null })),
    ...locked.map((id) => ({ id, owned: false, unlock: sources[id] })),
  ];
}
