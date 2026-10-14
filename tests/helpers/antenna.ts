import * as THREE from 'three';
import { ART } from '../../src/art/palette';

/**
 * Antenna tips sit on stalks (same check as the crowd-LOD test on art/crowd-lod-wasp-band):
 * every team-teal tip vertex is within `maxGap` of a stalk-coloured vertex above the body.
 * Returns the largest tip-to-stalk gap found.
 */
export function maxTipGap(
  g: THREE.BufferGeometry,
  stalkColor: string = ART.beeStripe,
  tipColor: string = ART.beeTeam,
): number {
  const pos = g.getAttribute('position');
  const col = g.getAttribute('color');
  const teal = new THREE.Color(tipColor);
  const stalk = new THREE.Color(stalkColor);
  const near = (c: THREE.Color, i: number) =>
    Math.abs(col.getX(i) - c.r) + Math.abs(col.getY(i) - c.g) + Math.abs(col.getZ(i) - c.b) < 1e-3;
  const tips: THREE.Vector3[] = [];
  const stalks: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    // Tips live up front, off-centre, at antenna height; this skips centred gems/badges and back accessories.
    if (near(teal, i) && v.z > 0.6 && v.y > 0.35 && Math.abs(v.x) > 0.08) tips.push(v);
    else if (near(stalk, i) && v.y > 0.25 && v.z > 0.55) stalks.push(v);
  }
  if (tips.length === 0) throw new Error('no antenna tips found');
  return Math.max(...tips.map((t) => Math.min(...stalks.map((s) => s.distanceTo(t)))));
}
