import * as THREE from 'three';

/**
 * Gate label sizing + camera framing shared by the renderer and the label
 * legibility test (art/ART_DIRECTION.md §5: farthest-row glyphs >= 18 CSS px
 * on a 360 px wide viewport).
 */
export const LABEL_H = 1.1;
export const LABEL_GROW = 1.5;
export const LABEL_TILT = -0.75;
/** Main glyph height as a share of the plate (72 px font on a 128 px canvas). */
export const GLYPH_SHARE = 72 / 128;
export const MIN_GLYPH_PX = 18;

export const labelHeight = (gateY: number, laneLength: number): number =>
  LABEL_H * (1 + LABEL_GROW * (gateY / laneLength));
export const labelCentreY = (h: number): number => 2.0 + h / 2;

/** Reference portrait aspect the base sizes are tuned for (360 x 780). */
const REF_ASPECT = 360 / 780;
/**
 * Shorter portrait screens (e.g. 360 x 640) show the lane smaller, so labels
 * scale up to keep the 18 px minimum. Landscape uses the base size.
 */
export const labelScale = (aspect: number): number =>
  aspect < 1 ? Math.min(1.5, Math.max(1, aspect / REF_ASPECT)) : 1;

/** Places the camera exactly as GameScene does (without shake). */
/** Nest model scale (feedback 2026-10-15: the enemy hive was hard to see). */
export const NEST_SCALE = 1.9;

export function frameCamera(cam: THREE.PerspectiveCamera, laneLength: number): void {
  const f = cameraFraming(cam.aspect, laneLength);
  cam.fov = f.fov;
  cam.position.set(0, f.height, f.back);
  cam.lookAt(0, 0, -f.lookAt);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
}

/**
 * Feedback round 2026-10-15 (Mohit playtest: "enemy hive barely visible"): a tighter, lower
 * camera that sits closer and looks further down the lane, so the nest fills more of the
 * frame and the empty sky band shrinks. Portrait still keeps the full lane width in view.
 */
export function cameraFraming(
  aspect: number,
  laneLength: number,
): { fov: number; height: number; back: number; lookAt: number } {
  const portrait = aspect < 1;
  // Round 3 (2026-10-16, Mohit: "zoom in much closer, more top-down"): narrower FOV, steeper
  // tilt (~41 deg vs ~32 deg) and a frame that uses the full screen height, nest at the top edge
  // and cannon at the bottom edge, so the whole lane is still in view but much larger.
  const k = Math.max(0.9, laneLength / 40);
  return portrait
    ? { fov: 50, height: 25 * k, back: 14 * k, lookAt: laneLength * 0.43 }
    : { fov: 42, height: 22 * k, back: 12 * k, lookAt: laneLength * 0.45 };
}

/** On-screen plate height (CSS px) of a gate label at lane position (x, y). */
export function labelPlatePx(
  cam: THREE.PerspectiveCamera,
  viewportH: number,
  x: number,
  gateY: number,
  laneLength: number,
): number {
  const h = labelHeight(gateY, laneLength) * labelScale(cam.aspect);
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, labelCentreY(h), -gateY),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), LABEL_TILT),
    new THREE.Vector3(1, 1, 1),
  );
  const top = new THREE.Vector3(0, h / 2, 0).applyMatrix4(m).project(cam).y;
  const bot = new THREE.Vector3(0, -h / 2, 0).applyMatrix4(m).project(cam).y;
  return (Math.abs(top - bot) * viewportH) / 2;
}
