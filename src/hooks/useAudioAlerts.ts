/**
 * Web Audio API & Multi-Tier Vietnamese Audio Alerts Hook for DriveGuard AI
 * Zero-failure sound engine featuring:
 * 1. Automatic AudioContext & HTML5 Audio Unlocking on any user interaction
 * 2. Preloaded Audio Cache with proper Base URL resolution for Vercel / GitHub / Production
 * 3. Tier 1: Localized Vietnamese MP3 voice alerts
 * 4. Tier 2: Real-time Web Audio API procedural synthesizer (offline & infallible)
 * 5. Tier 3: Native Web SpeechSynthesis API Vietnamese voice fallback
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { audioSynthesizer } from '../engine/AudioSynthesizer';
import { PrimaryAlertReason } from '../types';

export function useAudioAlerts() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeAlarmIntervalRef = useRef<number | null>(null);
  const lastSpokenTimeRef = useRef<number>(0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);
  const [isPlayingEmergency, setIsPlayingEmergency] = useState<boolean>(false);

  // Sound cache pool to avoid continuous new Audio() object creation
  const soundCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Helper to get safe base URL for sounds
  const getSoundUrl = useCallback((fileName: string) => {
    const rawBase = ((import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/').replace(/\/+$/, '');
    return `${rawBase}/sounds/${fileName}`;
  }, []);

  // Preload core sound files for zero-latency playback
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const coreSounds = [
      'alert_mat_tap_trung.mp3',
      'alert_buon_ngu_som.mp3',
      'alert_met_moi.mp3',
      'alert_guc_dau.mp3',
      'alert_nghieng_dau.mp3',
      'alert_roi_mat.mp3',
      'alert_nham_mat.mp3',
      'alert_khan_cap_lien_tuc.mp3',
      'beep_level.mp3'
    ];

    coreSounds.forEach((fileName) => {
      try {
        const audio = new Audio();
        audio.src = getSoundUrl(fileName);
        audio.preload = 'auto';
        soundCacheRef.current.set(fileName, audio);
      } catch {
        // Safe catch during initial page parse
      }
    });
  }, [getSoundUrl]);

  // Unlock AudioContext and HTML5 Audio upon first user interaction
  const unlockAudio = useCallback(() => {
    if (typeof window === 'undefined') return;

    // 1. Resume / Unlock Web Audio API Synthesizer
    audioSynthesizer.unlock();

    // 2. Initialize or resume local AudioContext
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }

    // 3. Play and instantly pause a cached audio or silent buffer
    try {
      const sample = soundCacheRef.current.get('beep_level.mp3');
      if (sample) {
        sample.volume = 0.01;
        sample.play().then(() => {
          sample.pause();
          sample.currentTime = 0;
          sample.volume = 1.0;
        }).catch(() => {});
      }
    } catch {
      // Safe catch
    }

    setIsAudioUnlocked(true);
  }, []);

  // Global user interaction listener to ensure audio is always unlocked early
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUserGesture = () => {
      unlockAudio();
    };

    window.addEventListener('pointerdown', handleUserGesture, { once: true, passive: true });
    window.addEventListener('touchstart', handleUserGesture, { once: true, passive: true });
    window.addEventListener('keydown', handleUserGesture, { once: true, passive: true });
    window.addEventListener('click', handleUserGesture, { once: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleUserGesture);
      window.removeEventListener('touchstart', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
      window.removeEventListener('click', handleUserGesture);
    };
  }, [unlockAudio]);

  const initAudioContext = useCallback(() => {
    unlockAudio();
  }, [unlockAudio]);

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

    // Also stop procedural emergency siren
    audioSynthesizer.stopEmergencySiren();

    setIsPlayingEmergency(false);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Safe catch
      }
    }
  }, []);

  // Speech synthesis fallback (Tier 3)
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
      utterance.rate = 1.15;
      utterance.pitch = 1.1;
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

  // Robust audio playback with 3-Tier Multi-Level Fallback
  const playCustomAudioFile = useCallback((
    fileName: string,
    minIntervalMs: number = 1800,
    loop: boolean = false,
    synthFallbackType: 'chime' | 'warning' | 'siren' = 'warning',
    speechFallbackText: string = 'Cảnh báo tài xế buồn ngủ!'
  ) => {
    if (isMuted || typeof window === 'undefined') return;
    const now = Date.now();
    if (!loop && now - lastSpokenTimeRef.current < minIntervalMs) return;
    lastSpokenTimeRef.current = now;

    // Ensure audio context is ready
    unlockAudio();

    try {
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
          currentAudioRef.current.currentTime = 0;
        } catch {
          // Safe catch
        }
      }

      // Try playing from cache or new Audio
      let audio = soundCacheRef.current.get(fileName);
      if (!audio) {
        audio = new Audio(getSoundUrl(fileName));
        soundCacheRef.current.set(fileName, audio);
      }

      audio.volume = 1.0;
      audio.loop = loop;
      audio.currentTime = 0;
      currentAudioRef.current = audio;

      if (loop) {
        setIsPlayingEmergency(true);
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn(`[DriveGuard Audio] MP3 (${fileName}) playback fallback triggered:`, err);
          
          // TIER 2: Procedural Web Audio API Synthesizer
          if (synthFallbackType === 'siren' || loop) {
            audioSynthesizer.startEmergencySiren();
            setIsPlayingEmergency(true);
          } else if (synthFallbackType === 'warning') {
            audioSynthesizer.playWarningBeep();
          } else {
            audioSynthesizer.playAttentionChime();
          }

          // TIER 3: Vietnamese Web Speech TTS Fallback
          speakVoiceAlert(speechFallbackText, 1500);
        });
      }
    } catch (e) {
      console.warn('[DriveGuard Audio] Direct error, switching to procedural synth:', e);
      // Fallback
      if (synthFallbackType === 'siren' || loop) {
        audioSynthesizer.startEmergencySiren();
        setIsPlayingEmergency(true);
      } else if (synthFallbackType === 'warning') {
        audioSynthesizer.playWarningBeep();
      } else {
        audioSynthesizer.playAttentionChime();
      }
      speakVoiceAlert(speechFallbackText, 1500);
    }
  }, [isMuted, unlockAudio, getSoundUrl, speakVoiceAlert]);

  // Continuous emergency siren with voice warning (Hú còi liên tục + Giọng cảnh báo)
  const playContinuousEmergencyAlert = useCallback(() => {
    if (isMuted) return;
    unlockAudio();
    stopActiveAlert();
    playCustomAudioFile(
      'alert_khan_cap_lien_tuc.mp3',
      0,
      true,
      'siren',
      'Khẩn cấp! Khẩn cấp! Dừng xe ngay lập tức, bạn đang cực kỳ buồn ngủ!'
    );
  }, [unlockAudio, isMuted, stopActiveAlert, playCustomAudioFile]);

  // Short click beep for sensitivity level changes (Mức 1 đến 5)
  const playBeepLevel = useCallback(() => {
    if (isMuted || typeof window === 'undefined') return;
    unlockAudio();
    try {
      const audio = soundCacheRef.current.get('beep_level.mp3') || new Audio(getSoundUrl('beep_level.mp3'));
      audio.volume = 0.9;
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Fallback Web Audio beep
        audioSynthesizer.playAttentionChime();
      });
    } catch {
      audioSynthesizer.playAttentionChime();
    }
  }, [unlockAudio, isMuted, getSoundUrl]);

  // Cảnh báo sớm: Mất tập trung -> alert_mat_tap_trung.mp3
  const playEarlyDistractionAlert = useCallback(() => {
    if (isMuted) return;
    playCustomAudioFile(
      'alert_mat_tap_trung.mp3',
      2000,
      false,
      'chime',
      'Chú ý! Bạn đang mất tập trung, hãy nhìn thẳng phía trước!'
    );
  }, [isMuted, playCustomAudioFile]);

  // Cảnh báo sớm: Buồn ngủ -> alert_buon_ngu_som.mp3
  const playEarlyDrowsinessAlert = useCallback(() => {
    if (isMuted) return;
    playCustomAudioFile(
      'alert_buon_ngu_som.mp3',
      2000,
      false,
      'chime',
      'Chú ý! Phát hiện dấu hiệu buồn ngủ sớm, hãy tập trung lái xe!'
    );
  }, [isMuted, playCustomAudioFile]);

  // Level 1 Alert: Cảnh báo sớm mệt mỏi / mất tập trung / chớm buồn ngủ
  const playLevel1Alert = useCallback((customReason?: PrimaryAlertReason) => {
    if (isMuted) return;

    if (customReason === 'EARLY_DISTRACTION' || customReason === 'HEAD_TURNED' || customReason === 'FACE_LOST') {
      playCustomAudioFile(
        'alert_mat_tap_trung.mp3',
        2000,
        false,
        'chime',
        'Chú ý! Bạn đang mất tập trung, hãy nhìn thẳng phía trước!'
      );
    } else if (customReason === 'EARLY_DROWSINESS' || customReason === 'DROWSY_DROOP') {
      playCustomAudioFile(
        'alert_buon_ngu_som.mp3',
        2000,
        false,
        'chime',
        'Chú ý! Phát hiện dấu hiệu buồn ngủ sớm, hãy tập trung lái xe!'
      );
    } else if (customReason === 'YAWN') {
      playCustomAudioFile(
        'alert_met_moi.mp3',
        2200,
        false,
        'chime',
        'Phát hiện dấu hiệu ngáp mệt mỏi, hãy chú ý quan sát!'
      );
    } else {
      playCustomAudioFile(
        'alert_buon_ngu_som.mp3',
        2200,
        false,
        'chime',
        'Chú ý! Hãy tập trung lái xe an toàn!'
      );
    }
  }, [isMuted, playCustomAudioFile]);

  // Level 2 Alert: Cảnh báo cụ thể theo hành vi của tài xế
  const playLevel2Alert = useCallback((customReason?: PrimaryAlertReason) => {
    if (isMuted) return;

    if (customReason === 'HEAD_DROP') {
      playCustomAudioFile(
        'alert_guc_dau.mp3',
        2000,
        false,
        'warning',
        'Cảnh báo! Phát hiện gục đầu, hãy ngẩng cao đầu lên ngay!'
      );
    } else if (customReason === 'HEAD_TILT_SLEEP') {
      playCustomAudioFile(
        'alert_nghieng_dau.mp3',
        2000,
        false,
        'warning',
        'Cảnh báo! Bạn đang nghiêng đầu nhắm mắt, hãy tỉnh táo lại!'
      );
    } else if (customReason === 'FACE_LOST' || customReason === 'HEAD_TURNED' || customReason === 'EARLY_DISTRACTION') {
      playCustomAudioFile(
        'alert_roi_mat.mp3',
        2000,
        false,
        'warning',
        'Cảnh báo! Rời mắt khỏi đường, hãy nhìn thẳng phía trước!'
      );
    } else if (customReason === 'EARLY_DROWSINESS' || customReason === 'DROWSY_DROOP') {
      playCustomAudioFile(
        'alert_buon_ngu_som.mp3',
        2000,
        false,
        'warning',
        'Cảnh báo! Bạn đang có biểu hiện buồn ngủ, hãy mở to mắt!'
      );
    } else {
      playCustomAudioFile(
        'alert_nham_mat.mp3',
        2000,
        false,
        'warning',
        'Cảnh báo! Bạn đang nhắm mắt, hãy mở mắt ra ngay lập tức!'
      );
    }
  }, [isMuted, playCustomAudioFile]);

  // Level 3 Alert: Nguy hiểm cực độ -> Còi hú liên tục + Giọng cảnh báo khẩn cấp
  const playLevel3Alert = useCallback((_customReason?: PrimaryAlertReason) => {
    if (isMuted) return;
    stopActiveAlert();
    playCustomAudioFile(
      'alert_khan_cap_lien_tuc.mp3',
      0,
      true,
      'siren',
      'BÁO ĐỘNG ĐỎ! DỪNG XE NGAY LẬP TỨC! BẠN ĐANG RƠI VÀO GIẤC NGỦ NGUY HIỂM!'
    );
  }, [isMuted, stopActiveAlert, playCustomAudioFile]);

  // Sound Test Helper to allow user to verify audio and unlock browser audio instantly
  const testAudioSystem = useCallback(() => {
    unlockAudio();
    playCustomAudioFile(
      'alert_buon_ngu_som.mp3',
      0,
      false,
      'chime',
      'Hệ thống âm thanh DriveGuard AI đã sẵn sàng hoạt động!'
    );
  }, [unlockAudio, playCustomAudioFile]);

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
    unlockAudio,
    isAudioUnlocked,
    testAudioSystem,
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
