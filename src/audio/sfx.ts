/** Tiny WebAudio synth: every sound is generated, no audio files. */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private hum: { osc: OscillatorNode; gain: GainNode } | null = null;
  private lastPop = 0;
  muted = false;

  /** Must be called from a user gesture (autoplay policy). */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 110;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start();
    this.hum = { osc, gain };
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
  }

  /** Swarm hum grows with unit count. */
  swarm(count: number): void {
    if (!this.hum || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.hum.gain.gain.setTargetAtTime(Math.min(0.08, count * 0.0003), t, 0.1);
    this.hum.osc.frequency.setTargetAtTime(100 + Math.min(80, count * 0.15), t, 0.2);
  }

  /** Gate pop: pitch rises with the swarm size. Throttled. */
  pop(count: number): void {
    if (!this.ctx || this.ctx.currentTime - this.lastPop < 0.045) return;
    this.lastPop = this.ctx.currentTime;
    this.tone('triangle', 520 + Math.min(900, count * 2.5), 0.08, 0.12, 1.6);
  }
  fire(): void {
    this.tone('sine', 300, 0.04, 0.04, 0.6);
  }
  thud(): void {
    this.tone('square', 90, 0.12, 0.12, 0.5);
  }
  hurt(): void {
    this.tone('sawtooth', 160, 0.2, 0.15, 0.4);
  }
  queen(): void {
    [440, 554, 659].forEach((f, i) => this.tone('triangle', f, 0.2, 0.15, 1, i * 0.07));
  }
  win(): void {
    [523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, 0.25, 0.18, 1, i * 0.11));
  }
  lose(): void {
    [392, 330, 262].forEach((f, i) => this.tone('sine', f, 0.3, 0.18, 0.9, i * 0.15));
  }

  private tone(type: OscillatorType, freq: number, dur: number, vol: number, bend: number, delay = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * bend, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

export function haptic(ms: number): void {
  if ('vibrate' in navigator) navigator.vibrate(ms);
}
