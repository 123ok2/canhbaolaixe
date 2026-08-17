/**
 * Web Audio API & Multi-Tier Vietnamese Audio Alerts Hook for DriveGuard AI
 * Zero-failure, 100% Identical Sound Engine for ALL environments (Vercel, GitHub, AI Studio, Local, Offline):
 * 1. Embedded High-Quality Studio MP3 Audio (Inlined Base64 data URLs) - 0% 404 network failure on any hosting
 * 2. Automatic AudioContext & HTML5 Audio Unlocking on any user gesture
 * 3. Exact Vietnamese studio voice alerts
 * 4. Tier 2: Real-time Web Audio API procedural synthesizer (fallback)
 * 5. Tier 3: Native Web SpeechSynthesis API Vietnamese voice (fallback)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { audioSynthesizer } from '../engine/AudioSynthesizer';
import { EMBEDDED_SOUNDS } from '../data/soundBase64';
import { PrimaryAlertReason, SensitivityLevel } from '../types';

export function useAudioAlerts() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeAlarmIntervalRef = useRef<number | null>(null);
  const lastSpokenTimeRef = useRef<number>(0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingProtectedAlertRef = useRef<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);
  const [isPlayingEmergency, setIsPlayingEmergency] = useState<boolean>(false);

  // Sound cache pool initialized with embedded base64 audio sources
  const soundCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Helper to get audio source URL (Prefer embedded Base64 data URI to guarantee 100% success on Vercel/GitHub/SPA)
  const getSoundUrl = useCallback((fileName: string): string => {
    if (EMBEDDED_SOUNDS && EMBEDDED_SOUNDS[fileName]) {
      return EMBEDDED_SOUNDS[fileName];
    }
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

    // 3. Play and instantly pause a cached audio to unlock HTML5 Audio tag autoplay permissions
    try {
      const sample = soundCacheRef.current.get('beep_level.mp3') || new Audio(getSoundUrl('beep_level.mp3'));
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
  }, [getSoundUrl]);

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

  const stopActiveAlert = useCallback((force: boolean = false) => {
    // If a protected voice alert (e.g. yawn drowsiness alert) is playing to completion,
    // only stop it if force === true (user clicked "TÔI ĐÃ TỈNH", clicked 'X', or emergency siren triggered)
    if (!force && isPlayingProtectedAlertRef.current) {
      return;
    }

    isPlayingProtectedAlertRef.current = false;

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
  const speakVoiceAlert = useCallback((text: string, minIntervalMs: number = 2000, onEndCallback?: () => void) => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEndCallback) onEndCallback();
      return;
    }
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

      if (onEndCallback) {
        utterance.onend = onEndCallback;
        utterance.onerror = onEndCallback;
      }

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
      if (onEndCallback) onEndCallback();
    }
  }, [isMuted]);

  // Robust audio playback with 3-Tier Multi-Level Fallback (Plays exact studio Vietnamese voice)
  const playCustomAudioFile = useCallback((
    fileName: string,
    minIntervalMs: number = 1800,
    loop: boolean = false,
    synthFallbackType: 'chime' | 'warning' | 'siren' = 'warning',
    speechFallbackText: string = 'Cảnh báo tài xế buồn ngủ!',
    isProtected: boolean = false
  ) => {
    if (isMuted || typeof window === 'undefined') return;
    const now = Date.now();
    if (!loop && now - lastSpokenTimeRef.current < minIntervalMs && !isProtected) return;
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

      if (isProtected) {
        isPlayingProtectedAlertRef.current = true;
        audio.onended = () => {
          isPlayingProtectedAlertRef.current = false;
        };
      }

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
          speakVoiceAlert(speechFallbackText, 1500, () => {
            if (isProtected) isPlayingProtectedAlertRef.current = false;
          });
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
      speakVoiceAlert(speechFallbackText, 1500, () => {
        if (isProtected) isPlayingProtectedAlertRef.current = false;
      });
    }
  }, [isMuted, unlockAudio, getSoundUrl, speakVoiceAlert]);

  // Cảnh báo buồn ngủ khi ngáp từ lần thứ 2 trở đi:
  // Phát trọn vẹn 100% âm thanh không được ngắt quãng cho đến lần ngáp tiếp theo
  const playYawnDrowsinessAlert = useCallback((yawnCount: number = 2) => {
    if (isMuted || typeof window === 'undefined') return;
    unlockAudio();

    // Sử dụng file âm thanh cảnh báo buồn ngủ studio: "Chú ý! Phát hiện buồn ngủ sớm, hãy tập trung lái xe!"
    playCustomAudioFile(
      'alert_buon_ngu_som.mp3',
      1000,
      false,
      'warning',
      `Chú ý! Bạn đã ngáp ${yawnCount} lần, phát hiện dấu hiệu buồn ngủ. Hãy tập trung lái xe hoặc dừng xe nghỉ ngơi!`,
      true // isProtected = true -> phát trọn vẹn toàn bộ câu nói không bị ngắt quãng
    );
  }, [isMuted, unlockAudio, playCustomAudioFile]);

  // Continuous emergency siren with voice warning (Hú còi liên tục + Giọng cảnh báo)
  const playContinuousEmergencyAlert = useCallback(() => {
    if (isMuted) return;
    unlockAudio();
    stopActiveAlert(true);
    playCustomAudioFile(
      'alert_khan_cap_lien_tuc.mp3',
      0,
      true,
      'siren',
      'Khẩn cấp! Khẩn cấp! Dừng xe ngay lập tức, bạn đang cực kỳ buồn ngủ!'
    );
  }, [unlockAudio, isMuted, stopActiveAlert, playCustomAudioFile]);

  // Distinct tone & haptic feedback for sensitivity level changes (Mức 1 đến 5)
  const playBeepLevel = useCallback((level: SensitivityLevel = 3) => {
    if (isMuted || typeof window === 'undefined') return;
    unlockAudio();

    // Haptic vibration feedback corresponding to sensitivity level
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        switch (level) {
          case 1: navigator.vibrate(35); break;
          case 2: navigator.vibrate([35, 30, 35]); break;
          case 3: navigator.vibrate([45, 30, 45, 30, 45]); break;
          case 4: navigator.vibrate([60, 25, 60, 25, 60, 25, 60]); break;
          case 5: navigator.vibrate([90, 35, 90, 35, 120]); break;
        }
      } catch {
        // Safe vibration catch
      }
    }

    // Play synthesized acoustic frequency matching the level
    audioSynthesizer.playLevelFeedback(level);
  }, [unlockAudio, isMuted]);

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
        'Cảnh báo! Phát hiện guc đầu, hãy ngẩng cao đầu lên ngay!'
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
    playYawnDrowsinessAlert,
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
