/**
 * Interactive Facial Calibration & Alignment Modal with Live Camera Feed,
 * Real-time Cyber Biometric Face Mesh & Smart Auto-Countdown
 */

import { CheckCircle2, Eye, RefreshCw, ShieldCheck, Smartphone, Smile, Sparkles, UserCheck, Video } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CONFIG } from '../config/constants';
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
  const [isFaceStable, setIsFaceStable] = useState<boolean>(false);
  const [isCapturingFlash, setIsCapturingFlash] = useState<boolean>(false);

  // Audio Context for countdown beeps
  const audioCtxRef = useRef<AudioContext | null>(null);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stableDetectionTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const onBeginCalibrationRef = useRef(onBeginCalibration);

  // Keep latest reference to onBeginCalibration to prevent re-render cancellation
  useEffect(() => {
    onBeginCalibrationRef.current = onBeginCalibration;
  }, [onBeginCalibration]);

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

    const primaryColor = '#06b6d4';
    const secondaryColor = '#22d3ee';
    const glowColor = 'rgba(6, 182, 212, 0.75)';

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

    // 1. Subtle Wireframe Cyber Mesh
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
  }, [landmarks, isStreaming]);

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

  // Stable Face Detection Tracker
  useEffect(() => {
    if (!isStreaming || calibration.isCalibrated || calibration.isCalibrating) {
      setIsFaceStable(false);
      if (stableDetectionTimerRef.current) {
        clearTimeout(stableDetectionTimerRef.current);
        stableDetectionTimerRef.current = null;
      }
      return;
    }

    if (hasLandmarks) {
      if (!stableDetectionTimerRef.current && !isFaceStable && countdown === null) {
        // Face is present: after 350ms of stable face, auto-start countdown
        stableDetectionTimerRef.current = window.setTimeout(() => {
          setIsFaceStable(true);
          startCountdown();
        }, 350);
      }
    } else {
      // Face lost
      if (stableDetectionTimerRef.current) {
        clearTimeout(stableDetectionTimerRef.current);
        stableDetectionTimerRef.current = null;
      }
      setIsFaceStable(false);
    }

    return () => {
      if (stableDetectionTimerRef.current) {
        clearTimeout(stableDetectionTimerRef.current);
      }
    };
  }, [hasLandmarks, isStreaming, calibration.isCalibrated, calibration.isCalibrating, countdown, isFaceStable]);

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
      if (stableDetectionTimerRef.current) {
        clearTimeout(stableDetectionTimerRef.current);
      }
    };
  }, []);

  // If calibrated or camera not streaming, don't render UI
  if (calibration.isCalibrated || !isStreaming) return null;

  const totalFrames = CONFIG.CALIBRATION_FRAMES_REQUIRED;
  const currentCount = Math.min(totalFrames, calibration.samplesCount);
  const progressPercent = Math.round((currentCount / totalFrames) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-slate-900/95 border border-cyan-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-cyan-950/70 text-center backdrop-blur-md">
        {/* Glow ambient background accents */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Shutter Capture Flash Effect */}
        {isCapturingFlash && (
          <div className="absolute inset-0 z-50 bg-white/80 animate-ping pointer-events-none duration-200" />
        )}

        {/* Top Header Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Bước 1: Xác thực Khuôn mặt & Căn chỉnh Góc nhìn</span>
        </div>

        {/* Title */}
        <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
          Căn chỉnh & Hiệu chỉnh Khuôn mặt
        </h2>
        <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto leading-relaxed">
          Hãy giữ điện thoại đối diện tầm mắt. Hệ thống sẽ tự động nhận diện và đếm ngược để lưu thông số mắt & miệng chuẩn của bạn.
        </p>

        {/* Live Camera Viewport with Face Oval Guideline */}
        <div className="relative w-full h-60 sm:h-72 bg-slate-950 rounded-2xl border-2 border-cyan-500/40 overflow-hidden mb-4 flex items-center justify-center group shadow-2xl">
          {/* Real-time Video Stream */}
          <video
            ref={previewVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100 bg-slate-950"
          />

          {/* Real-time Canvas Mesh Overlay */}
          <canvas
            ref={previewCanvasRef}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100 z-10"
          />

          {/* Biometric Face Alignment Oval HUD */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div
              className={`w-40 h-52 sm:w-48 sm:h-60 rounded-[50%] border-2 transition-all duration-300 flex items-center justify-center relative ${
                hasLandmarks
                  ? 'border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.45)] scale-100'
                  : 'border-amber-400/80 border-dashed animate-pulse scale-95'
              }`}
            >
              {/* Corner Biometric Brackets */}
              <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-300" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-300" />
              <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-300" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-300" />

              {/* Center Eye Level Target Guide */}
              <div className="absolute inset-x-3 h-0.5 bg-cyan-400/30 shadow-xs shadow-cyan-400/50" />

              {/* Scanning Laser Line when calibrating */}
              {calibration.isCalibrating && (
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-bounce shadow-md shadow-cyan-400" />
              )}
            </div>
          </div>

          {/* Real-time Status Overlay Pill */}
          <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between pointer-events-none z-20">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-[11px]">
              <span className={`w-2 h-2 rounded-full ${hasLandmarks ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
              <span className={hasLandmarks ? 'text-cyan-300 font-semibold' : 'text-amber-300 font-medium'}>
                {hasLandmarks ? '✓ Đã khớp khuôn mặt' : '⚠️ Hãy hướng mặt vào giữa khung'}
              </span>
            </div>

            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-700/80 text-[10px] text-cyan-300 font-mono">
              <Video className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>LIVE VIEW</span>
            </div>
          </div>

          {/* Large Center Countdown Number 3 -> 2 -> 1 */}
          {countdown !== null && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-xs animate-in zoom-in duration-150">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-cyan-500/50 border-4 border-white/30 animate-pulse">
                <span className="text-4xl sm:text-5xl font-black text-white drop-shadow-md">
                  {countdown === 0 ? '📷' : countdown}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white mt-3 tracking-wide drop-shadow-md bg-slate-950/80 px-3 py-1 rounded-full border border-cyan-500/40">
                {countdown === 0 ? 'Đang chụp mẫu & đo đạc...' : 'Giữ yên tư thế lái xe & nhìn thẳng'}
              </p>
            </div>
          )}
        </div>

        {/* 3 Step Guidance Cards */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-left">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
            <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-1">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-200">1. Cố định máy</span>
            <span className="text-[10px] text-slate-400 leading-tight">Thẳng tầm mắt</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-1">
              <Eye className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-200">2. Mở mắt tự nhiên</span>
            <span className="text-[10px] text-slate-400 leading-tight">Nhìn về trước</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
            <div className="w-6 h-6 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-1">
              <Smile className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-200">3. Khép miệng</span>
            <span className="text-[10px] text-slate-400 leading-tight">Thả lỏng 2s</span>
          </div>
        </div>

        {/* Dynamic Action Section: Calibration Progress or Controls */}
        {calibration.isCalibrating ? (
          <div className="space-y-2 bg-slate-950/80 p-3.5 rounded-2xl border border-cyan-500/40 animate-pulse">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-300 font-semibold flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                Đang đo tỷ lệ mắt & cằm ({currentCount}/{totalFrames})
              </span>
              <span className="text-cyan-400 font-bold text-sm">{progressPercent}%</span>
            </div>

            <div className="w-full h-2.5 bg-slate-900 rounded-full border border-slate-800 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-150 shadow-md shadow-cyan-500/50"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">Vui lòng tiếp tục giữ yên trong chốc lát...</p>
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
              <span>{hasLandmarks ? 'BẮT ĐẦU ĐẾM NGƯỢC NGAY' : 'HÃY HƯỚNG MẶT VÀO KHUNG CAMERA'}</span>
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
