import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { frameCamera, cameraFraming, NEST_SCALE } from '../src/render/gateLabel';
import { Shake, SHAKE_CAP, SHAKE_KICK, shakeEnabled } from '../src/render/shake';
import { defaultSave, parseSave } from '../src/platform/save';

describe('round 3: close, steeper camera', () => {
  for (const [name, w, h] of [
    ['phone 390x844', 390, 844],
    ['desktop column 1280x800 (9:16)', 450, 800],
  ] as const)
    for (const L of [32, 40, 44])
      it(`${name}, lane ${L}: nest and cannon on screen, tilt steeper than before`, () => {
        const cam = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
        frameCamera(cam, L);
        const nestTop = new THREE.Vector3(0, 4.5 * NEST_SCALE * 0.7, -L - 1.4).project(cam);
        const cannon = new THREE.Vector3(0, 0, 0.6).project(cam);
        const edge = new THREE.Vector3(5, 0, -0.2).project(cam);
        expect(nestTop.y).toBeLessThan(1);
        expect(cannon.y).toBeGreaterThan(-1);
        expect(Math.abs(edge.x)).toBeLessThanOrEqual(1);
        const f = cameraFraming(w / h, L);
        const tilt = (Math.atan2(f.height, f.back + f.lookAt) * 180) / Math.PI;
        expect(tilt).toBeGreaterThan(38); // round 2 was ~32 deg
      });
});

describe('round 3: screen shake root-cause fix', () => {
  it('is off by default and in old saves', () => {
    expect(defaultSave().settings.shake).toBe(false);
    expect(
      parseSave(JSON.stringify({ version: 1, settings: { muted: true } })).settings.shake,
    ).toBe(false);
  });
  it('reduced motion always wins', () => {
    expect(shakeEnabled(true, true)).toBe(false);
    expect(shakeEnabled(true, false)).toBe(true);
    expect(shakeEnabled(false, false)).toBe(false);
  });
  it('nest hits never shake, even when enabled and continuous', () => {
    const s = new Shake(true);
    for (let i = 0; i < 600; i++) {
      s.kick('nestHit');
      expect(s.update(1 / 60)).toEqual({ x: 0, y: 0 });
    }
    expect(SHAKE_KICK.nestHit).toBe(0);
  });
  it('big events are capped and decay to zero quickly', () => {
    const s = new Shake(true);
    for (let i = 0; i < 20; i++) s.kick('end');
    expect(s.amp).toBe(SHAKE_CAP);
    for (let i = 0; i < 30; i++) s.update(1 / 60);
    expect(s.amp).toBe(0);
  });
  it('disabled shake ignores every kick', () => {
    const s = new Shake(false);
    s.kick('end');
    s.kick('hiveHit');
    expect(s.update(1 / 60)).toEqual({ x: 0, y: 0 });
  });
});
