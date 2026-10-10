/**
 * Adaptive quality: watches frame time and steps the render pixel ratio down
 * (before ever touching simulation quality) to hold ~60fps, and back up when
 * there is headroom. Pure logic so it can be unit-tested.
 */
export const QUALITY_STEPS = [2, 1.5, 1.25, 1, 0.75];

export class QualityScaler {
  level: number;
  private avg = 16.7;
  private cooldown = 0;

  constructor(
    private readonly deviceRatio: number,
    startLevel = 0,
  ) {
    this.level = startLevel;
    while (this.level < QUALITY_STEPS.length - 1 && QUALITY_STEPS[this.level] > deviceRatio)
      this.level++;
  }

  get pixelRatio(): number {
    return Math.min(this.deviceRatio, QUALITY_STEPS[this.level]);
  }

  /** Feed a frame time in ms; returns true when the pixel ratio changed. */
  sample(frameMs: number): boolean {
    this.avg = this.avg * 0.95 + Math.min(100, frameMs) * 0.05;
    if (this.cooldown > 0) {
      this.cooldown--;
      return false;
    }
    if (this.avg > 20 && this.level < QUALITY_STEPS.length - 1) {
      this.level++;
      this.cooldown = 90;
      return true;
    }
    if (this.avg < 14 && this.level > 0 && QUALITY_STEPS[this.level - 1] <= this.deviceRatio) {
      this.level--;
      this.cooldown = 240;
      return true;
    }
    return false;
  }
}
