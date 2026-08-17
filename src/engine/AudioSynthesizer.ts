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
   * Play distinct acoustic feedback when switching between sensitivity levels (1 to 5)
   */
  public playLevelFeedback(level: number): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const lvl = Math.max(1, Math.min(5, level));

      switch (lvl) {
        case 1: {
          // Level 1: 1 soft gentle pulse (523Hz C5)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }
        case 2: {
          // Level 2: 2 calm pulses (659Hz E5)
          [0, 0.10].forEach((offset) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(659, now + offset);
            gain.gain.setValueAtTime(0.25, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.1);
          });
          break;
        }
        case 3: {
          // Level 3: 3 crisp bright pulses (880Hz A5)
          [0, 0.08, 0.16].forEach((offset) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now + offset);
            gain.gain.setValueAtTime(0.3, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.09);
          });
          break;
        }
        case 4: {
          // Level 4: 4 rapid high pulses (1174Hz D6)
          [0, 0.06, 0.12, 0.18].forEach((offset) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1174, now + offset);
            gain.gain.setValueAtTime(0.35, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.07);
          });
          break;
        }
        case 5: {
          // Level 5: High-intensity dual sharp emergency chime (1480Hz -> 1760Hz)
          [0, 0.12].forEach((offset, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(idx === 0 ? 1480 : 1760, now + offset);
            gain.gain.setValueAtTime(0.35, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.11);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.12);
          });
          break;
        }
      }
    } catch (e) {
      console.warn('Level feedback audio error:', e);
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
   * Play an urgent triple-burst Warning (Tier 2 fallback for level 2)
   */
  public playWarningBeep(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.11, 0.22].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1180, now + offset);
        osc.frequency.exponentialRampToValueAtTime(820, now + offset + 0.08);

        gain.gain.setValueAtTime(0.45, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.10);
      });
    } catch (e) {
      console.warn('Synthesizer warning beep error:', e);
    }
  }

  /**
   * Play instant high-urgency rapid danger strobe burst (5 rapid piercing pulses)
   */
  public playUrgentDangerStrobe(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // 5 rapid-fire high-pitch pulses (80ms spacing)
      [0, 0.08, 0.16, 0.24, 0.32].forEach((offset, idx) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';

        const baseFreq = idx % 2 === 0 ? 1650 : 2100;
        osc1.frequency.setValueAtTime(baseFreq, now + offset);
        osc2.frequency.setValueAtTime(baseFreq * 1.25, now + offset);

        gain.gain.setValueAtTime(0.5, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.06);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now + offset);
        osc2.start(now + offset);
        osc1.stop(now + offset + 0.07);
        osc2.stop(now + offset + 0.07);
      });
    } catch (e) {
      console.warn('Synthesizer danger strobe error:', e);
    }
  }

  /**
   * Play continuous high-urgency rapid emergency siren (Tier 2 fallback for level 3)
   * Rapid, sharp, fast-paced staccato sweep (90ms cycle) for maximum driver awakening urgency
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
      osc2.type = 'square';

      gain.gain.setValueAtTime(0.45, ctx.currentTime);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      let step = 0;
      // Rapid 90ms alternating alarm steps for urgent, fast-paced hazard warning
      const freqTable1 = [1200, 1850, 1050, 1650, 2200, 1400];
      const freqTable2 = [1750, 2400, 1550, 2250, 2800, 1950];

      const intervalId = window.setInterval(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const idx = step % freqTable1.length;
        osc1.frequency.setValueAtTime(freqTable1[idx], t);
        osc2.frequency.setValueAtTime(freqTable2[idx], t);
        
        // Fast pulsating volume modulation to create urgent staccato piercing effect
        gain.gain.setValueAtTime(step % 2 === 0 ? 0.5 : 0.35, t);
        step++;
      }, 90);

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
