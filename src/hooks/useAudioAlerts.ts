/**
 * Web Audio API & Vietnamese Audio Alerts Hook for DriveGuard AI
 * Seamlessly plays localized Vietnamese MP3 alerts for driving hazards and sensitivity adjustments.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { PrimaryAlertReason } from '../types';

export function useAudioAlerts() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeAlarmIntervalRef = useRef<number | null>(null);
  const lastSpokenTimeRef = useRef<number>(0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [isPlayingEmergency, setIsPlayingEmergency] = useState<boolean>(false);

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
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {
        // Safe catch
      }
      currentAudioRef.current = null;
    }
    setIsPlayingEmergency(false);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Safe catch
      }
    }
  }, []);

  // Play custom audio file from /sounds/ directory
  const playCustomAudioFile = useCallback((fileName: string, minIntervalMs: number = 1800, loop: boolean = false) => {
    if (isMuted || typeof window === 'undefined') return;
    const now = Date.now();
    if (!loop && now - lastSpokenTimeRef.current < minIntervalMs) return;
    lastSpokenTimeRef.current = now;

    try {
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
        } catch {
          // Safe catch
        }
      }

      const audio = new Audio(`/sounds/${fileName}`);
      audio.volume = 1.0;
      audio.loop = loop;
      currentAudioRef.current = audio;
      if (loop) {
        setIsPlayingEmergency(true);
      }
      audio.play().catch(() => {
        // Safe catch for browser autoplay policies
      });
    } catch {
      // Safe fallback
    }
  }, [isMuted]);

  // Continuous emergency siren with voice warning (Hú còi liên tục + Giọng cảnh báo)
  const playContinuousEmergencyAlert = useCallback(() => {
    if (isMuted) return;
    initAudioContext();
    stopActiveAlert();
    playCustomAudioFile('alert_khan_cap_lien_tuc.mp3', 0, true);
  }, [initAudioContext, isMuted, stopActiveAlert, playCustomAudioFile]);

  // Short click beep for sensitivity level changes (Mức 1 đến 5)
  const playBeepLevel = useCallback(() => {
    if (isMuted || typeof window === 'undefined') return;
    try {
      const audio = new Audio('/sounds/beep_level.mp3');
      audio.volume = 0.9;
      audio.play().catch(() => {
        // Fallback Web Audio beep if needed
        initAudioContext();
        const ctx = audioCtxRef.current;
        if (ctx) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(1200, ctx.currentTime);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.15);
        }
      });
    } catch {
      // Safe fallback
    }
  }, [initAudioContext, isMuted]);

  // Speech synthesis fallback if needed
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
      utterance.rate = 1.1;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
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
      // Safe catch
    }
  }, [isMuted]);

  // Cảnh báo sớm: Mất tập trung -> alert_mat_tap_trung.mp3
  const playEarlyDistractionAlert = useCallback(() => {
    if (isMuted) return;
    initAudioContext();
    playCustomAudioFile('alert_mat_tap_trung.mp3', 2000);
  }, [initAudioContext, isMuted, playCustomAudioFile]);

  // Cảnh báo sớm: Buồn ngủ -> alert_buon_ngu_som.mp3
  const playEarlyDrowsinessAlert = useCallback(() => {
    if (isMuted) return;
    initAudioContext();
    playCustomAudioFile('alert_buon_ngu_som.mp3', 2000);
  }, [initAudioContext, isMuted, playCustomAudioFile]);

  // Level 1 Alert: Cảnh báo sớm mệt mỏi / mất tập trung / chớm buồn ngủ
  const playLevel1Alert = useCallback((customReason?: PrimaryAlertReason) => {
    if (isMuted) return;
    initAudioContext();

    if (customReason === 'EARLY_DISTRACTION' || customReason === 'HEAD_TURNED' || customReason === 'FACE_LOST') {
      // alert_mat_tap_trung.mp3: "Chú ý! Bạn đang mất tập trung, hãy nhìn thẳng phía trước!"
      playCustomAudioFile('alert_mat_tap_trung.mp3', 2000);
    } else if (customReason === 'EARLY_DROWSINESS' || customReason === 'DROWSY_DROOP') {
      // alert_buon_ngu_som.mp3: "Chú ý! Phát hiện buồn ngủ sớm, hãy tập trung lái xe!"
      playCustomAudioFile('alert_buon_ngu_som.mp3', 2000);
    } else if (customReason === 'YAWN') {
      // alert_met_moi.mp3: "Phát hiện dấu hiệu mệt mỏi, hãy chú ý quan sát!"
      playCustomAudioFile('alert_met_moi.mp3', 2200);
    } else {
      playCustomAudioFile('alert_buon_ngu_som.mp3', 2200);
    }
  }, [initAudioContext, isMuted, playCustomAudioFile]);

  // Level 2 Alert: Cảnh báo cụ thể theo hành vi của tài xế
  const playLevel2Alert = useCallback((customReason?: PrimaryAlertReason) => {
    if (isMuted) return;
    initAudioContext();

    if (customReason === 'HEAD_DROP') {
      // 1. alert_guc_dau.mp3: "Cảnh báo! Phát hiện gục đầu, hãy ngẩng cao đầu lên ngay!"
      playCustomAudioFile('alert_guc_dau.mp3', 2000);
    } else if (customReason === 'HEAD_TILT_SLEEP') {
      // 3. alert_nghieng_dau.mp3: "Cảnh báo! Bạn đang nghiêng đầu nhắm mắt, hãy tỉnh táo lại!"
      playCustomAudioFile('alert_nghieng_dau.mp3', 2000);
    } else if (customReason === 'FACE_LOST' || customReason === 'HEAD_TURNED' || customReason === 'EARLY_DISTRACTION') {
      // 4. alert_roi_mat.mp3 / alert_mat_tap_trung.mp3: "Cảnh báo! Rời mắt khỏi đường, hãy nhìn thẳng phía trước!"
      playCustomAudioFile('alert_roi_mat.mp3', 2000);
    } else if (customReason === 'EARLY_DROWSINESS' || customReason === 'DROWSY_DROOP') {
      // alert_buon_ngu_som.mp3
      playCustomAudioFile('alert_buon_ngu_som.mp3', 2000);
    } else {
      // 2. alert_nham_mat.mp3: "Cảnh báo! Bạn đang nhắm mắt, hãy mở mắt ra ngay!"
      playCustomAudioFile('alert_nham_mat.mp3', 2000);
    }
  }, [initAudioContext, isMuted, playCustomAudioFile]);

  // Level 3 Alert: Nguy hiểm cực độ -> alert_khan_cap_lien_tuc.mp3 (Còi hú liên tục + Giọng cảnh báo khẩn cấp)
  const playLevel3Alert = useCallback((customReason?: PrimaryAlertReason) => {
    if (isMuted) return;
    initAudioContext();
    stopActiveAlert();
    // Kích hoạt còi hú liên tục kèm giọng nói cảnh báo khẩn cấp
    playCustomAudioFile('alert_khan_cap_lien_tuc.mp3', 0, true);
  }, [initAudioContext, isMuted, stopActiveAlert, playCustomAudioFile]);

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
    playEarlyDistractionAlert,
    playEarlyDrowsinessAlert,
    playContinuousEmergencyAlert,
    isPlayingEmergency,
    playCustomAudioFile,
    playBeepLevel,
    stopActiveAlert,
    speakVoiceAlert,
    isMuted,
    toggleMute
  };
}
