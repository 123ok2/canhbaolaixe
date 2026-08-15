/**
 * Web Audio API Procedural Synthesizer for DriveGuard AI
 * Zero-dependency, 100% offline & infallible sound generator.
 * Used as an instant fallback whenever external MP3 files fail or are blocked.
 */

class WebAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private activeSirenNodes: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode; intervalId: number } | null = null;

  public getAudioContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Unlock Web Audio & HTML5 Audio on user interaction
   */
  public unlock(): boolean {
    const ctx = this.getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      // Play a short 1-sample silent buffer to unlock on iOS / Safari / Chrome
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      this.isUnlocked = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Play a crisp, high-pitch Attention Chime (Tier 2 fallback for level 1 / distraction)
   */
  public playAttentionChime(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12); // E6

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Synthesizer chime error:', e);
    }
  }

  /**
   * Play an urgent dual-beep Warning (Tier 2 fallback for level 2)
   */
  public playWarningBeep(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.18].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1050, now + offset);
        osc.frequency.exponentialRampToValueAtTime(750, now + offset + 0.12);

        gain.gain.setValueAtTime(0.4, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
    } catch (e) {
      console.warn('Synthesizer warning beep error:', e);
    }
  }

  /**
   * Play continuous loud emergency alarm (Tier 2 fallback for level 3)
   */
  public startEmergencySiren(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.stopEmergencySiren();

    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      gain.gain.setValueAtTime(0.35, ctx.currentTime);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      let step = 0;
      const intervalId = window.setInterval(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        if (step % 2 === 0) {
          osc1.frequency.setValueAtTime(950, t);
          osc2.frequency.setValueAtTime(1400, t);
        } else {
          osc1.frequency.setValueAtTime(650, t);
          osc2.frequency.setValueAtTime(1100, t);
        }
        step++;
      }, 250);

      osc1.start();
      osc2.start();

      this.activeSirenNodes = { osc1, osc2, gain, intervalId };
    } catch (e) {
      console.warn('Synthesizer siren start error:', e);
    }
  }

  public stopEmergencySiren(): void {
    if (this.activeSirenNodes) {
      try {
        clearInterval(this.activeSirenNodes.intervalId);
        this.activeSirenNodes.gain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
        this.activeSirenNodes.osc1.stop();
        this.activeSirenNodes.osc2.stop();
        this.activeSirenNodes.osc1.disconnect();
        this.activeSirenNodes.osc2.disconnect();
        this.activeSirenNodes.gain.disconnect();
      } catch {
        // Safe catch
      }
      this.activeSirenNodes = null;
    }
  }
}

export const audioSynthesizer = new WebAudioSynthesizer();
