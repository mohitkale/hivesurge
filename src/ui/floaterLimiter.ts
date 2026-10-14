/**
 * Rate limit for gate "+N" floaters (fix/perf-lowend-2). Under a big swarm the same gate
 * fires many spawn events per second, and each spawned a floater at the same spot, so the
 * labels stacked into an unreadable smear. Allow one floater per gate per cooldown and a
 * small number on screen at once.
 */
export class FloaterLimiter {
  private readonly last = new Map<number, number>();
  private live: number[] = [];

  constructor(
    private readonly cooldownMs = 600,
    private readonly maxLive = 3,
    private readonly lifeMs = 700,
  ) {}

  allow(gate: number, nowMs: number): boolean {
    this.live = this.live.filter((t) => nowMs - t < this.lifeMs);
    if (this.live.length >= this.maxLive) return false;
    const prev = this.last.get(gate);
    if (prev !== undefined && nowMs - prev < this.cooldownMs) return false;
    this.last.set(gate, nowMs);
    this.live.push(nowMs);
    return true;
  }
}
