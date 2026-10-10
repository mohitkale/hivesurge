/** Original Opus cues in public/assets/audio (made by art/tools/make-audio.sh). */
export const CUES = [
  'fire',
  'pop',
  'thud',
  'hurt',
  'queen',
  'win',
  'lose',
  'hum',
  'music',
] as const;
export type Cue = (typeof CUES)[number];

/**
 * WebAudio player for the original Opus cue set. Every cue falls back to the
 * old procedural synth if its file fails to load/decode (e.g. no Opus support),
 * so the game never goes silent and never blocks on audio.
 */
export class Sfx {
  private readonly buffers = new Map<Cue, AudioBuffer>();
  private music: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private humSample: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
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
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    void this.load();
  }

  private async load(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || typeof fetch !== 'function') return;
    const base = `${import.meta.env.BASE_URL}assets/audio/`;
    await Promise.all(
      CUES.map(async (c) => {
        try {
          const res = await fetch(`${base}${c}.ogg`);
          if (!res.ok) return;
          this.buffers.set(c, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch {
          /* keep synth fallback for this cue */
        }
      }),
    );
    this.startLoops();
  }

  private loop(cue: Cue, vol: number): { src: AudioBufferSourceNode; gain: GainNode } | null {
    const buf = this.buffers.get(cue);
    if (!buf || !this.ctx || !this.master) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(gain).connect(this.master);
    src.start();
    return { src, gain };
  }

  private startLoops(): void {
    this.music ??= this.loop('music', 0.35);
    if (!this.humSample) {
      this.humSample = this.loop('hum', 0);
      // Sample hum replaces the synth hum oscillator.
      if (this.humSample && this.hum) {
        this.hum.osc.stop();
        this.hum = null;
      }
    }
  }

  /** Plays a loaded cue; returns false so the caller can fall back to synth. */
  private play(cue: Cue, vol = 1, rate = 1): boolean {
    const buf = this.buffers.get(cue);
    if (!buf || !this.ctx || !this.master) return false;
    if (this.muted) return true;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(this.master);
    src.start();
    return true;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
  }

  /** Swarm hum grows with unit count. */
  swarm(count: number): void {
    if (this.humSample && this.ctx) {
      const t = this.ctx.currentTime;
      this.humSample.gain.gain.setTargetAtTime(Math.min(0.35, count * 0.0012), t, 0.1);
      this.humSample.src.playbackRate.setTargetAtTime(1 + Math.min(0.7, count * 0.0013), t, 0.2);
      return;
    }
    if (!this.hum || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.hum.gain.gain.setTargetAtTime(Math.min(0.08, count * 0.0003), t, 0.1);
    this.hum.osc.frequency.setTargetAtTime(100 + Math.min(80, count * 0.15), t, 0.2);
  }

  /** Gate pop: pitch rises with the swarm size. Throttled. */
  pop(count: number): void {
    if (!this.ctx || this.ctx.currentTime - this.lastPop < 0.045) return;
    this.lastPop = this.ctx.currentTime;
    if (this.play('pop', 0.6, 1 + Math.min(1.5, count * 0.004))) return;
    this.tone('triangle', 520 + Math.min(900, count * 2.5), 0.08, 0.12, 1.6);
  }
  fire(): void {
    if (this.play('fire', 0.35)) return;
    this.tone('sine', 300, 0.04, 0.04, 0.6);
  }
  thud(): void {
    if (this.play('thud', 0.8)) return;
    this.tone('square', 90, 0.12, 0.12, 0.5);
  }
  hurt(): void {
    if (this.play('hurt', 0.7)) return;
    this.tone('sawtooth', 160, 0.2, 0.15, 0.4);
  }
  queen(): void {
    if (this.play('queen', 0.9)) return;
    [440, 554, 659].forEach((f, i) => this.tone('triangle', f, 0.2, 0.15, 1, i * 0.07));
  }
  win(): void {
    if (this.play('win', 0.9)) return;
    [523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, 0.25, 0.18, 1, i * 0.11));
  }
  lose(): void {
    if (this.play('lose', 0.9)) return;
    [392, 330, 262].forEach((f, i) => this.tone('sine', f, 0.3, 0.18, 0.9, i * 0.15));
  }

  private tone(
    type: OscillatorType,
    freq: number,
    dur: number,
    vol: number,
    bend: number,
    delay = 0,
  ): void {
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
