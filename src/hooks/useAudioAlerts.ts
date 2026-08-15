/**
 * Web Audio API & Speech Synthesis Hook for DriveGuard AI Alert Sounds
 * Provides pure synthesizer sound generation and Vietnamese voice warnings without relying on external audio assets.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { PrimaryAlertReason } from '../types';

export function useAudioAlerts() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeAlarmIntervalRef = useRef<number | null>(null);
  const lastSpokenTimeRef = useRef<number>(0);
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
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Safe catch
      }
    }
  }, []);

  // Store available voices
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      try {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          voicesRef.current = available;
        }
      } catch {
        // Safe catch
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Vietnamese Voice Announcement with throttle protection and mobile resume handling
  const speakVoiceAlert = useCallback((text: string, minIntervalMs: number = 2000) => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const now = Date.now();
    if (now - lastSpokenTimeRef.current < minIntervalMs) return;
    lastSpokenTimeRef.current = now;

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
      // Look for Vietnamese voice first (e.g. Google Tiếng Việt, Microsoft HoaiMy, etc.)
      const viVoice = voices.find((v) => 
        v.lang === 'vi-VN' || 
        v.lang === 'vi_VN' || 
        v.lang.toLowerCase().startsWith('vi') || 
        v.name.toLowerCase().includes('vietnam') || 
        v.name.toLowerCase().includes('vietnamese')
      );

      if (viVoice) {
        utterance.voice = viVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore if speech synthesis restricted
    }
  }, [isMuted]);

  // Helper to play custom audio file from /sounds/ directory with fallback
  const playCustomAudioFile = useCallback((fileName: string) => {
    if (isMuted || typeof window === 'undefined') return;
    try {
      const audio = new Audio(`/sounds/${fileName}`);
      audio.volume = 1.0;
      audio.play().catch(() => {
        // Safe catch for autoplay restrictions or empty draft files
      });
    } catch {
      // Safe fallback
    }
  }, [isMuted]);

  // Level 1 Alert: Soft gentle double-beep (Tired / Early warning)
  const playLevel1Alert = useCallback((customReason?: PrimaryAlertReason) => {
    if (isMuted) return;
    initAudioContext();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // Trigger custom audio file if present
    playCustomAudioFile('alert_met_moi.mp3');

    const playBeep = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playBeep(587.33, now, 0.14);        // D5
    playBeep(739.99, now + 0.16, 0.20); // F#5

    if (customReason === 'YAWN') {
      speakVoiceAlert('Phát hiện dấu hiệu mệt mỏi, hãy chú ý quan sát!', 4000);
    } else {
      speakVoiceAlert('Chú ý tập trung lái xe!', 4000);
    }
  }, [initAudioContext, isMuted, speakVoiceAlert]);

  // Level 2 Alert: Urgent warning pulse (Head Drop / Eyes Closed / Face Lost)
  const playLevel2Alert = useCallback((customReason?: PrimaryAlertReason) => {
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

      osc1.frequency.setValueAtTime(880, now);       // A5
      osc1.frequency.setValueAtTime(987.77, now + 0.08); // B5

      osc2.frequency.setValueAtTime(440, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.32);
      osc2.stop(now + 0.32);
    };

    pulse();
    setTimeout(pulse, 350);

    // Voice announcement tailored to danger reason
    if (customReason === 'HEAD_DROP') {
      speakVoiceAlert('Cảnh báo! Phát hiện gục đầu, hãy ngẩng đầu lên ngay!', 2000);
    } else if (customReason === 'HEAD_TILT_SLEEP') {
      speakVoiceAlert('Cảnh báo! Bạn đang nghiêng đầu nhắm mắt, hãy tỉnh táo lại ngay!', 2000);
    } else if (customReason === 'FACE_LOST') {
      speakVoiceAlert('Cảnh báo! Rời mặt khỏi camera, hãy nhìn thẳng vào đường!', 2000);
    } else if (customReason === 'EYES_CLOSED') {
      speakVoiceAlert('Cảnh báo buồn ngủ! Vui lòng mở mắt và tập trung!', 2000);
    } else if (customReason === 'HEAD_TURNED') {
      speakVoiceAlert('Cảnh báo! Hãy nhìn về phía trước đường!', 2000);
    } else {
      speakVoiceAlert('Cảnh báo! Bạn có dấu hiệu buồn ngủ nguy hiểm!', 2500);
    }
  }, [initAudioContext, isMuted, stopActiveAlert, speakVoiceAlert]);

  // Level 3 Alert: High-Intensity Loud Siren for Danger state
  const playLevel3Alert = useCallback((customReason?: PrimaryAlertReason) => {
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
      osc.frequency.linearRampToValueAtTime(1500, now + 0.18);
      osc.frequency.linearRampToValueAtTime(800, now + 0.36);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.6, now + 0.02);
      gain.gain.setValueAtTime(0.6, now + 0.34);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.38);
    };

    playSirenBurst();
    activeAlarmIntervalRef.current = window.setInterval(playSirenBurst, 400);

    if (customReason === 'HEAD_DROP') {
      speakVoiceAlert('Nguy hiểm cực độ! Gục đầu lái xe, dừng xe nghỉ ngơi ngay!', 2500);
    } else if (customReason === 'HEAD_TILT_SLEEP') {
      speakVoiceAlert('Nguy hiểm cực độ! Nghiêng đầu ngủ gật, hãy mở to mắt và nhìn thẳng ngay!', 2500);
    } else if (customReason === 'FACE_LOST') {
      speakVoiceAlert('Nguy hiểm! Mất dấu khuôn mặt, hãy tập trung vào tay lái!', 2500);
    } else if (customReason === 'EYES_CLOSED') {
      speakVoiceAlert('Nguy hiểm cực độ! Bạn đang nhắm mắt, hãy mở mắt ra ngay!', 2000);
    } else {
      speakVoiceAlert('Nguy hiểm cực độ! Hãy mở mắt và dừng xe ngay lập tức!', 2500);
    }
  }, [initAudioContext, isMuted, stopActiveAlert, speakVoiceAlert]);

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
    speakVoiceAlert,
    isMuted,
    toggleMute
  };
}
