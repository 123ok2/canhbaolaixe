/**
 * Web Audio API Hook for DriveGuard AI Alert Sounds
 * Provides pure synthesizer sound generation without relying on external audio assets.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export function useAudioAlerts() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeAlarmIntervalRef = useRef<number | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Initialize or resume AudioContext on user interaction
  const initAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const stopActiveAlert = useCallback(() => {
    if (activeAlarmIntervalRef.current !== null) {
      clearInterval(activeAlarmIntervalRef.current);
      activeAlarmIntervalRef.current = null;
    }
  }, []);

  // Level 1 Alert: Soft gentle double-beep
  const playLevel1Alert = useCallback(() => {
    if (isMuted) return;
    initAudioContext();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const playBeep = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.exponentialRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playBeep(523.25, now, 0.12);        // C5
    playBeep(659.25, now + 0.15, 0.18); // E5
  }, [initAudioContext, isMuted]);

  // Level 2 Alert: Moderate warning pulse
  const playLevel2Alert = useCallback(() => {
    if (isMuted) return;
    initAudioContext();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    stopActiveAlert();

    const pulse = () => {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sawtooth';

      osc1.frequency.setValueAtTime(784, now);       // G5
      osc1.frequency.setValueAtTime(880, now + 0.1); // A5

      osc2.frequency.setValueAtTime(392, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    };

    pulse();
    // Repeat twice
    setTimeout(pulse, 400);
  }, [initAudioContext, isMuted, stopActiveAlert]);

  // Level 3 Alert: Loud urgent siren sound for Danger state
  const playLevel3Alert = useCallback(() => {
    if (isMuted) return;
    initAudioContext();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    stopActiveAlert();

    const playSirenBurst = () => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      
      // Siren sweep frequency up and down
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(1400, now + 0.18);
      osc.frequency.linearRampToValueAtTime(800, now + 0.36);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
      gain.gain.setValueAtTime(0.5, now + 0.34);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.38);
    };

    playSirenBurst();
    activeAlarmIntervalRef.current = window.setInterval(playSirenBurst, 450);
  }, [initAudioContext, isMuted, stopActiveAlert]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    stopActiveAlert();
  }, [stopActiveAlert]);

  useEffect(() => {
    return () => {
      stopActiveAlert();
    };
  }, [stopActiveAlert]);

  return {
    initAudioContext,
    playLevel1Alert,
    playLevel2Alert,
    playLevel3Alert,
    stopActiveAlert,
    isMuted,
    toggleMute
  };
}
