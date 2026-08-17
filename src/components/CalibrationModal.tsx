/**
 * Interactive Facial & Phone Mounting Angle Calibration Modal
 * Real-time Phone Placement Angle Diagnosis & Auto-Start Live Monitoring
 */

import { CheckCircle2, Compass, Eye, RefreshCw, ShieldCheck, Smartphone, Sparkles, UserCheck, Video } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from '../config/constants';
import { calculateEAR } from '../engine/EyeAnalysis';
import { HeadPoseAnalyzer } from '../engine/HeadPoseDetection';
import { calculateMAR } from '../engine/YawnDetection';
import { CalibrationData } from '../types';

interface Point3D {
  x: number;
  y: number;
  z?: number;
}

interface CalibrationModalProps {
  isStreaming: boolean;
  hasLandmarks: boolean;
  landmarks?: Point3D[] | null;
  calibration: CalibrationData;
  stream?: MediaStream | null;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onBeginCalibration: () => void;
  onSkip: () => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isStreaming,
  hasLandmarks,
  landmarks = null,
  calibration,
  stream,
  videoRef,
  onBeginCalibration,
  onSkip
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturingFlash, setIsCapturingFlash] = useState<boolean>(false);

  // Audio Context for countdown beeps and success chime
  const audioCtxRef = useRef<AudioContext | null>(null);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const onBeginCalibrationRef = useRef(onBeginCalibration);
  const wasCalibratingRef = useRef<boolean>(false);

  // Keep latest reference to onBeginCalibration to prevent re-render cancellation
  useEffect(() => {
    onBeginCalibrationRef.current = onBeginCalibration;
  }, [onBeginCalibration]);

  // Track calibration active state to trigger completion sound
  useEffect(() => {
    if (calibration.isCalibrating) {
      wasCalibratingRef.current = true;
    }
  }, [calibration.isCalibrating]);

  // Robustly bind live video stream to preview video
  useEffect(() => {
    const videoEl = previewVideoRef.current;
    if (!videoEl) return;

    const targetStream = stream || (videoRef?.current?.srcObject as MediaStream | null);
    if (targetStream && videoEl.srcObject !== targetStream) {
      videoEl.srcObject = targetStream;
      videoEl.play().catch(() => {});
    }
  }, [stream, videoRef, isStreaming]);

  // Smoothed telemetry data to eliminate frame-to-frame number flicker and layout jumps
  const smoothedRef = useRef({
    pitch: 0,
    yaw: 0,
    roll: 0,
    ear: 0.3,
    mar: 0.2,
    centerX: 0.5,
    centerY: 0.5,
    scale: 0.25,
    isInitialized: false,
    pitchStatus: 'Góc ngẩng chuẩn',
    yawStatus: 'Giữa vô lăng',
    eyeStatus: '✓ Mắt mở tự nhiên',
    alignedStreak: 0,
    unalignedStreak: 0,
    isAlignedDebounced: false,
  });

  const [displayPose, setDisplayPose] = useState<{
    pitch: number;
    yaw: number;
    roll: number;
    ear: number;
    mar: number;
    centerX: number;
    centerY: number;
    scale: number;
    pitchStatus: string;
    yawStatus: string;
    eyeStatus: string;
    isAligned: boolean;
  } | null>(null);

  const lastUiUpdateTimeRef = useRef<number>(0);

  // Live real-time analysis of face pose and angle with EMA smoothing & hysteresis
  useEffect(() => {
    if (!landmarks || landmarks.length < 400) {
      if (displayPose !== null) {
        setDisplayPose(null);
      }
      return;
    }

    const rawPose = HeadPoseAnalyzer.calculateRawPose(landmarks);
    const rawEar = (calculateEAR(landmarks, CONFIG.FACEMESH_LEFT_EYE) + calculateEAR(landmarks, CONFIG.FACEMESH_RIGHT_EYE)) / 2;
    const rawMar = calculateMAR(landmarks);

    const s = smoothedRef.current;
    if (!s.isInitialized) {
      s.pitch = rawPose.pitch;
      s.yaw = rawPose.yaw;
      s.roll = rawPose.roll;
      s.ear = rawEar;
      s.mar = rawMar;
      s.centerX = rawPose.centerX;
      s.centerY = rawPose.centerY;
      s.scale = rawPose.scale;
      s.isInitialized = true;
    } else {
      // Exponential Moving Average filter (alpha = 0.16) for buttery-smooth number transitions
      const alpha = 0.16;
      s.pitch += (rawPose.pitch - s.pitch) * alpha;
      s.yaw += (rawPose.yaw - s.yaw) * alpha;
      s.roll += (rawPose.roll - s.roll) * alpha;
      s.ear += (rawEar - s.ear) * alpha;
      s.mar += (rawMar - s.mar) * alpha;
      s.centerX += (rawPose.centerX - s.centerX) * alpha;
      s.centerY += (rawPose.centerY - s.centerY) * alpha;
      s.scale += (rawPose.scale - s.scale) * alpha;
    }

    // Instant alignment test on smoothed coordinates
    const isCentered = s.centerX >= 0.25 && s.centerX <= 0.75 && s.centerY >= 0.20 && s.centerY <= 0.80;
    const isGoodDistance = s.scale >= 0.12 && s.scale <= 0.50;
    const isEyesOpen = s.ear >= 0.20;
    const isAlignedRaw = isCentered && isGoodDistance && isEyesOpen;

    if (isAlignedRaw) {
      s.alignedStreak++;
      s.unalignedStreak = 0;
      if (s.alignedStreak >= 3) {
        s.isAlignedDebounced = true;
      }
    } else {
      s.unalignedStreak++;
      s.alignedStreak = 0;
      if (s.unalignedStreak >= 4) {
        s.isAlignedDebounced = false;
      }
    }

    // Hysteresis calculation for Pitch Status text
    if (s.pitchStatus === 'Máy ngửa lên (Bù trừ +)') {
      if (s.pitch <= 17) s.pitchStatus = 'Góc ngẩng chuẩn';
    } else if (s.pitchStatus === 'Máy cụp xuống (Bù trừ -)') {
      if (s.pitch >= -11) s.pitchStatus = 'Góc ngẩng chuẩn';
    } else {
      if (s.pitch > 22) s.pitchStatus = 'Máy ngửa lên (Bù trừ +)';
      else if (s.pitch < -15) s.pitchStatus = 'Máy cụp xuống (Bù trừ -)';
    }

    // Hysteresis calculation for Yaw Status text
    if (s.yawStatus === 'Kẹp bên phải taplo') {
      if (s.yaw >= -7) s.yawStatus = 'Giữa vô lăng';
    } else if (s.yawStatus === 'Kẹp bên trái taplo') {
      if (s.yaw <= 7) s.yawStatus = 'Giữa vô lăng';
    } else {
      if (s.yaw < -12) s.yawStatus = 'Kẹp bên phải taplo';
      else if (s.yaw > 12) s.yawStatus = 'Kẹp bên trái taplo';
    }

    // Hysteresis calculation for Eye Status text
    if (s.eyeStatus === '✓ Mắt mở tự nhiên') {
      if (s.ear < 0.19) s.eyeStatus = '⚠️ Mở mắt tự nhiên';
    } else {
      if (s.ear >= 0.22) s.eyeStatus = '✓ Mắt mở tự nhiên';
    }

    // Throttle React state update to ~140ms interval to eliminate UI number flash & jump
    const now = Date.now();
    if (now - lastUiUpdateTimeRef.current >= 140) {
      lastUiUpdateTimeRef.current = now;
      setDisplayPose({
        pitch: Math.round(s.pitch * 10) / 10,
        yaw: Math.round(s.yaw * 10) / 10,
        roll: Math.round(s.roll * 10) / 10,
        ear: Math.round(s.ear * 100) / 100,
        mar: Math.round(s.mar * 100) / 100,
        centerX: s.centerX,
        centerY: s.centerY,
        scale: s.scale,
        pitchStatus: s.pitchStatus,
        yawStatus: s.yawStatus,
        eyeStatus: s.eyeStatus,
        isAligned: s.isAlignedDebounced,
      });
    }
  }, [landmarks]);

  const isAligned = displayPose?.isAligned ?? false;

  // Draw real-time face mesh on the preview canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    const video = previewVideoRef.current;
    if (!canvas || !video || !isStreaming) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length < 400) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const currentAligned = smoothedRef.current.isAlignedDebounced;
    const primaryColor = currentAligned ? '#10b981' : '#06b6d4';
    const secondaryColor = currentAligned ? '#34d399' : '#22d3ee';
    const glowColor = currentAligned ? 'rgba(16, 185, 129, 0.75)' : 'rgba(6, 182, 212, 0.75)';

    // Helper: Draw smooth loop
    const drawContour = (
      pointIndices: number[],
      isClosed: boolean = true,
      lineWidth: number = 1.6,
      strokeColor: string = primaryColor
    ) => {
      if (!pointIndices || pointIndices.length === 0) return;
      ctx.beginPath();
      pointIndices.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        const x = pt.x * width;
        const y = pt.y * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (isClosed) ctx.closePath();
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    };

    // 1. Wireframe Cyber Mesh
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = secondaryColor;
    CONFIG.FACEMESH_CYBER_EDGES.forEach(([p1Idx, p2Idx]) => {
      const pt1 = landmarks[p1Idx];
      const pt2 = landmarks[p2Idx];
      if (pt1 && pt2) {
        ctx.beginPath();
        ctx.moveTo(pt1.x * width, pt1.y * height);
        ctx.lineTo(pt2.x * width, pt2.y * height);
        ctx.stroke();
      }
    });
    ctx.restore();

    // 2. Face Contours with Glow
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
    drawContour(CONFIG.FACEMESH_FACE_OVAL, true, 1.8, primaryColor);
    drawContour(CONFIG.FACEMESH_LEFT_EYEBROW, false, 1.5, secondaryColor);
    drawContour(CONFIG.FACEMESH_RIGHT_EYEBROW, false, 1.5, secondaryColor);
    drawContour(CONFIG.FACEMESH_LEFT_EYE_CONTOUR, true, 1.8, primaryColor);
    drawContour(CONFIG.FACEMESH_RIGHT_EYE_CONTOUR, true, 1.8, primaryColor);
    drawContour(CONFIG.FACEMESH_NOSE_BRIDGE, false, 1.5, secondaryColor);
    drawContour(CONFIG.FACEMESH_MOUTH_OUTER, true, 1.8, primaryColor);
    ctx.restore();

    // 3. Anchor nodes
    ctx.save();
    CONFIG.FACEMESH_KEY_FACE.forEach((idx) => {
      const pt = landmarks[idx];
      if (pt) {
        const x = pt.x * width;
        const y = pt.y * height;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });
    ctx.restore();

    ctx.restore();
  }, [landmarks, isStreaming, isAligned]);

  const playBeep = useCallback((freq: number, duration: number = 0.1) => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      if (!audioCtxRef.current) return;

      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context fail-safe
    }
  }, []);

  // Ascending celebration chord when calibration succeeds and activates
  const playSuccessChime = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      if (!audioCtxRef.current) return;

      const ctx = audioCtxRef.current;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + i * 0.09;
        const duration = 0.25;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.20, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch {
      // safe fallback
    }
  }, []);

  // Countdown timer logic (3 -> 2 -> 1 -> 0)
  const startCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    setCountdown(3);
    playBeep(659.25, 0.12); // E5

    let currentVal = 3;

    countdownIntervalRef.current = window.setInterval(() => {
      currentVal -= 1;
      if (currentVal > 0) {
        setCountdown(currentVal);
        playBeep(currentVal === 2 ? 783.99 : 987.77, 0.14); // G5 or B5
      } else if (currentVal === 0) {
        setCountdown(0);
        playBeep(1318.51, 0.25); // E6 shutter chime
        setIsCapturingFlash(true);

        setTimeout(() => {
          setIsCapturingFlash(false);
        }, 350);

        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }

        setTimeout(() => {
          setCountdown(null);
          onBeginCalibrationRef.current();
        }, 300);
      }
    }, 1000);
  }, [playBeep]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Khi hoàn thành hiệu chuẩn (isCalibrated = true): Phát âm thanh xác nhận và TỰ ĐỘNG VÀO HOẠT ĐỘNG LUÔN
  useEffect(() => {
    if (calibration.isCalibrated && wasCalibratingRef.current) {
      wasCalibratingRef.current = false;
      playSuccessChime();
    }
  }, [calibration.isCalibrated, playSuccessChime]);

  // TỰ ĐỘNG ĐÓNG MODAL VÀ HOẠT ĐỘNG NGAY KHI ĐÃ HIỆU CHUẨN XONG
  if (calibration.isCalibrated || !isStreaming) return null;

  const totalFrames = CONFIG.CALIBRATION_FRAMES_REQUIRED;
  const currentCount = Math.min(totalFrames, calibration.samplesCount);
  const progressPercent = Math.round((currentCount / totalFrames) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[94vh] overflow-y-auto bg-slate-900/95 border border-cyan-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-cyan-950/80 text-center backdrop-blur-md">
        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Shutter Capture Flash Effect */}
        {isCapturingFlash && (
          <div className="absolute inset-0 z-50 bg-white/80 animate-ping pointer-events-none duration-200" />
        )}

        {/* Top Header Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Bước 1: Hiệu chỉnh Góc Điện thoại & Khuôn mặt Chuẩn</span>
        </div>

        {/* Title */}
        <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
          Căn chỉnh Vị trí & Góc Giá Đỡ Điện Thoại
        </h2>
        <p className="text-xs text-slate-400 mb-3 max-w-md mx-auto leading-relaxed">
          Hệ thống sẽ đo góc đặt điện thoại thực tế (taplo/kính lái) và lưu hướng nhìn thẳng của bạn làm chuẩn, sau đó sẽ <strong>tự động kích hoạt giám sát an toàn</strong>.
        </p>

        {/* Camera Viewport with Face Target HUD */}
        <div className="relative w-full h-56 sm:h-64 bg-slate-950 rounded-2xl border-2 border-cyan-500/40 overflow-hidden mb-3.5 flex items-center justify-center group shadow-2xl">
          <video
            ref={previewVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100 bg-slate-950"
          />

          <canvas
            ref={previewCanvasRef}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100 z-10"
          />

          {/* Biometric Face Alignment Oval HUD */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div
              className={`w-36 h-48 sm:w-44 sm:h-56 rounded-[50%] border-2 transition-colors duration-300 flex items-center justify-center relative ${
                isAligned
                  ? 'border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.45)]'
                  : hasLandmarks
                  ? 'border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                  : 'border-amber-400/80 border-dashed animate-pulse'
              }`}
            >
              {/* Corner Biometric Brackets */}
              <div className={`absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 ${isAligned ? 'border-emerald-300' : 'border-cyan-300'}`} />
              <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 ${isAligned ? 'border-emerald-300' : 'border-cyan-300'}`} />
              <div className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 ${isAligned ? 'border-emerald-300' : 'border-cyan-300'}`} />
              <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 ${isAligned ? 'border-emerald-300' : 'border-cyan-300'}`} />

              {/* Center Eye Level Target Guide */}
              <div className={`absolute inset-x-3 h-0.5 ${isAligned ? 'bg-emerald-400/50 shadow-emerald-400' : 'bg-cyan-400/30'}`} />

              {/* Scanning Laser Line when calibrating */}
              {calibration.isCalibrating && (
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-bounce shadow-md shadow-cyan-400" />
              )}
            </div>
          </div>

          {/* Real-time Status Overlay Pill */}
          <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between pointer-events-none z-20">
            <div className="h-6 flex items-center gap-1.5 px-2.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-[11px] overflow-hidden">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isAligned ? 'bg-emerald-400' : hasLandmarks ? 'bg-cyan-400' : 'bg-amber-400 animate-ping'}`} />
              <span className={`truncate ${isAligned ? 'text-emerald-300 font-semibold' : hasLandmarks ? 'text-cyan-300 font-medium' : 'text-amber-300 font-medium'}`}>
                {isAligned ? '✓ Góc máy & khuôn mặt chuẩn' : hasLandmarks ? 'Đang căn góc nhìn đường...' : '⚠️ Hướng mặt vào khung camera'}
              </span>
            </div>

            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-700/80 text-[10px] text-cyan-300 font-mono">
              <Video className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>LIVE HUD</span>
            </div>
          </div>

          {/* Countdown Center Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/65 backdrop-blur-xs animate-in zoom-in duration-150">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-cyan-500/50 border-4 border-white/30 animate-pulse">
                <span className="text-4xl sm:text-5xl font-black text-white drop-shadow-md">
                  {countdown === 0 ? '📷' : countdown}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white mt-3 tracking-wide drop-shadow-md bg-slate-950/80 px-3 py-1 rounded-full border border-cyan-500/40">
                {countdown === 0 ? 'Đang đo góc & lưu mẫu chuẩn...' : 'Giữ yên tư thế lái xe & nhìn thẳng'}
              </p>
            </div>
          )}
        </div>

        {/* Live Phone Angle & Mounting Telemetry Diagnosis */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3.5 text-left">
          {/* Card 1: Pitch (Góc ngẩng / cúi) */}
          <div className="h-[74px] sm:h-20 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-cyan-400" />
                Góc ngẩng/cúi
              </span>
              <span className="text-[11px] font-mono font-bold text-cyan-300 tabular-nums w-12 text-right">
                {displayPose ? `${displayPose.pitch > 0 ? '+' : ''}${displayPose.pitch.toFixed(1)}°` : '--'}
              </span>
            </div>
            <div className="h-5 flex items-center text-[10px] text-slate-300 font-medium leading-tight truncate">
              {displayPose ? displayPose.pitchStatus : 'Đang đo góc...'}
            </div>
          </div>

          {/* Card 2: Yaw (Vị trí kẹp máy Trái/Phải) */}
          <div className="h-[74px] sm:h-20 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                <Compass className="w-3 h-3 text-blue-400" />
                Vị trí kẹp máy
              </span>
              <span className="text-[11px] font-mono font-bold text-blue-300 tabular-nums w-12 text-right">
                {displayPose ? `${displayPose.yaw > 0 ? '+' : ''}${displayPose.yaw.toFixed(1)}°` : '--'}
              </span>
            </div>
            <div className="h-5 flex items-center text-[10px] text-slate-300 font-medium leading-tight truncate">
              {displayPose ? displayPose.yawStatus : 'Đang định vị...'}
            </div>
          </div>

          {/* Card 3: Eye & Mouth Readiness */}
          <div className="col-span-2 sm:col-span-1 h-[74px] sm:h-20 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                <Eye className="w-3 h-3 text-emerald-400" />
                Mắt & Miệng
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-300 tabular-nums w-16 text-right">
                {displayPose ? `EAR ${displayPose.ear.toFixed(2)}` : '--'}
              </span>
            </div>
            <div className="h-5 flex items-center text-[10px] text-slate-300 font-medium leading-tight truncate">
              {displayPose ? displayPose.eyeStatus : 'Chờ nhận diện'}
            </div>
          </div>
        </div>

        {/* Calibration Progress or Action Buttons */}
        {calibration.isCalibrating ? (
          <div className="space-y-2 bg-slate-950/90 p-4 rounded-2xl border border-cyan-500/40 animate-pulse">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-300 font-semibold flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                Đang lưu góc máy & khuôn mặt ({currentCount}/{totalFrames})
              </span>
              <span className="text-cyan-400 font-bold text-sm">{progressPercent}%</span>
            </div>

            <div className="w-full h-2.5 bg-slate-900 rounded-full border border-slate-800 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 rounded-full transition-all duration-150 shadow-md shadow-cyan-500/50"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">Giữ nguyên tư thế, hệ thống sẽ tự động bắt đầu giám sát...</p>
          </div>
        ) : countdown !== null ? (
          <div className="py-2 flex items-center justify-center gap-2 text-cyan-300 text-xs font-semibold">
            <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Đang đếm ngược để chụp mẫu chuẩn...</span>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={startCountdown}
              id="btn-start-calibration-sampling"
              disabled={!hasLandmarks}
              className={`w-full py-3.5 px-5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] ${
                hasLandmarks
                  ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:from-cyan-400 hover:to-cyan-400 text-slate-950 shadow-cyan-500/30 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-80'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{hasLandmarks ? 'BẮT ĐẦU HIỆU CHỈNH GÓC & KHUÔN MẶT' : 'HÃY HƯỚNG MẶT VÀO KHUNG CAMERA'}</span>
            </button>

            <button
              onClick={onSkip}
              id="btn-skip-calibration"
              className="w-full py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700/50 transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Bỏ qua (Dùng thông số chuẩn mặc định)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
