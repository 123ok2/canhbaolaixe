/**
 * Real-time Camera Feed with High-Performance Canvas Overlay for Facial Landmarks
 * & Integrated Sleek In-Camera Sensitivity Controls (Levels 1 to 5)
 * Fully Optimized for Mobile & Desktop
 */

import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, Camera, Compass, Eye, RefreshCw, Smartphone } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { CONFIG } from '../config/constants';
import { CalibrationData, DistractionMetrics, DrowsinessState, EyeMetrics, HeadPoseMetrics, SensitivityLevel, YawnMetrics } from '../types';

interface Point3D {
  x: number;
  y: number;
  z?: number;
}

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isStreaming: boolean;
  landmarks: Point3D[] | null;
  state: DrowsinessState;
  score: number;
  calibration: CalibrationData;
  eyeMetrics: EyeMetrics;
  yawnMetrics: YawnMetrics;
  headPose: HeadPoseMetrics;
  distractionMetrics?: DistractionMetrics;
  faceDetected?: boolean;
  primaryAlertReason?: import('../types').PrimaryAlertReason;
  environment?: import('../types').EnvironmentDiagnostics;
  sensitivityLevel?: SensitivityLevel;
  onChangeSensitivity?: (level: SensitivityLevel) => void;
  onPlayFeedback?: (level: SensitivityLevel) => void;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  videoRef,
  isStreaming,
  landmarks,
  state,
  score,
  calibration,
  eyeMetrics,
  yawnMetrics,
  headPose,
  distractionMetrics,
  faceDetected = true,
  primaryAlertReason,
  sensitivityLevel = 3,
  onChangeSensitivity,
  onPlayFeedback
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas drawing effect for landmarks
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video || !isStreaming) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas dimensions to video feed
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length < 400) return;

    // Dynamic Color Palette for Futuristic Biometric AI Mask
    let primaryColor = '#06b6d4'; // Cyber Cyan (Default)
    let secondaryColor = '#22d3ee'; // Light Cyan
    let glowColor = 'rgba(6, 182, 212, 0.7)';
    let meshAlpha = 0.22;

    const isDistractedNow = distractionMetrics?.isDistracted;

    if (state === DrowsinessState.DANGER) {
      primaryColor = '#ef4444'; // Red
      secondaryColor = '#f87171';
      glowColor = 'rgba(239, 68, 68, 0.85)';
      meshAlpha = 0.45;
    } else if (state === DrowsinessState.WARNING || isDistractedNow) {
      primaryColor = '#f97316'; // Orange
      secondaryColor = '#fb923c';
      glowColor = 'rgba(249, 115, 22, 0.8)';
      meshAlpha = 0.35;
    } else if (state === DrowsinessState.TIRED) {
      primaryColor = '#f59e0b'; // Amber
      secondaryColor = '#fbbf24';
      glowColor = 'rgba(245, 158, 11, 0.7)';
      meshAlpha = 0.3;
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Helper: Draw smooth loop from landmark array
    const drawContour = (
      pointIndices: number[],
      isClosed: boolean = true,
      lineWidth: number = 1.6,
      strokeColor: string = primaryColor,
      fillColor?: string
    ) => {
      if (!pointIndices || pointIndices.length === 0) return;
      ctx.beginPath();
      pointIndices.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (pt) {
          const x = pt.x * width;
          const y = pt.y * height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      });
      if (isClosed) ctx.closePath();

      if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }

      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    };

    // 1. Draw Subtle Wireframe Triangulation (Cybernetic Facemesh)
    ctx.save();
    ctx.globalAlpha = meshAlpha;
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

    // 2. Draw Outer Face Oval with Neon Glow
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    drawContour(CONFIG.FACEMESH_FACE_OVAL, true, 1.8, primaryColor);
    ctx.restore();

    // 3. Draw Eyebrows (Left & Right)
    drawContour(CONFIG.FACEMESH_LEFT_EYEBROW, false, 1.6, secondaryColor);
    drawContour(CONFIG.FACEMESH_RIGHT_EYEBROW, false, 1.6, secondaryColor);

    // 4. Draw Eyes with Dynamic Status Highlighting & Iris Tracking
    const eyeStrokeColor = eyeMetrics.isClosed ? '#ef4444' : secondaryColor;
    const eyeGlowColor = eyeMetrics.isClosed ? 'rgba(239, 68, 68, 0.9)' : glowColor;

    ctx.save();
    ctx.shadowColor = eyeGlowColor;
    ctx.shadowBlur = 12;
    drawContour(CONFIG.FACEMESH_LEFT_EYE_CONTOUR, true, 2.0, eyeStrokeColor);
    drawContour(CONFIG.FACEMESH_RIGHT_EYE_CONTOUR, true, 2.0, eyeStrokeColor);

    // 4b. Draw Iris (Nhãn cầu / Con ngươi - 478 points model) when eyes are open
    if (!eyeMetrics.isClosed && landmarks.length >= 478) {
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#06b6d4';
      drawContour(CONFIG.FACEMESH_LEFT_IRIS, true, 1.4, '#38bdf8', 'rgba(56, 189, 248, 0.35)');
      drawContour(CONFIG.FACEMESH_RIGHT_IRIS, true, 1.4, '#38bdf8', 'rgba(56, 189, 248, 0.35)');

      // Iris Centers (468 Left, 473 Right)
      const leftIris = landmarks[468];
      const rightIris = landmarks[473];
      if (leftIris) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(leftIris.x * width, leftIris.y * height, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      if (rightIris) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(rightIris.x * width, rightIris.y * height, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // 4c. Draw ROI Bounding Box Brackets (Crop vùng quan tâm)
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const marginX = (maxX - minX) * 0.12;
    const marginY = (maxY - minY) * 0.12;
    const bx = Math.max(0, (minX - marginX) * width);
    const by = Math.max(0, (minY - marginY) * height);
    const bw = Math.min(width - bx, (maxX - minX + 2 * marginX) * width);
    const bh = Math.min(height - by, (maxY - minY + 2 * marginY) * height);
    const bracketLen = Math.min(bw, bh) * 0.18;

    ctx.save();
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = 0.55;
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(bx, by + bracketLen); ctx.lineTo(bx, by); ctx.lineTo(bx + bracketLen, by);
    ctx.stroke();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(bx + bw - bracketLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + bracketLen);
    ctx.stroke();
    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(bx, by + bh - bracketLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + bracketLen, by + bh);
    ctx.stroke();
    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(bx + bw - bracketLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - bracketLen);
    ctx.stroke();
    ctx.restore();

    // 5. Draw Nose Bridge
    drawContour(CONFIG.FACEMESH_NOSE_BRIDGE, false, 1.5, primaryColor);

    // 6. Draw Mouth (Outer & Inner Lips)
    const mouthColor = yawnMetrics.isYawning ? '#f59e0b' : primaryColor;
    const mouthFill = yawnMetrics.isYawning ? 'rgba(245, 158, 11, 0.25)' : undefined;
    drawContour(CONFIG.FACEMESH_MOUTH_OUTER, true, 1.8, mouthColor, mouthFill);
    drawContour(CONFIG.FACEMESH_MOUTH_INNER, true, 1.2, secondaryColor);

    // 7. Draw 3D Orientation Vector from Nose Tip
    const nose = landmarks[1];
    if (nose) {
      const startX = nose.x * width;
      const startY = nose.y * height;

      // Project 3D angles to 2D vector
      const vectorLength = 38;
      const radPitch = (headPose.pitch * Math.PI) / 180;
      const radYaw = (headPose.yaw * Math.PI) / 180;

      const endX = startX + vectorLength * Math.sin(radYaw);
      const endY = startY - vectorLength * Math.sin(radPitch);

      ctx.save();
      ctx.strokeStyle = isDistractedNow ? '#f97316' : '#38bdf8';
      ctx.lineWidth = 2.4;
      ctx.shadowColor = isDistractedNow ? '#f97316' : '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // End vector pointer dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(endX, endY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }, [landmarks, isStreaming, state, eyeMetrics, yawnMetrics, headPose, distractionMetrics, videoRef]);

  // Status Badge Helper
  const getStatusBadge = () => {
    if (distractionMetrics?.isDistracted) {
      if (distractionMetrics.distractionLevel === 'CRITICAL') {
        return {
          bg: 'bg-red-950/95 border-red-600 text-red-200 animate-pulse',
          text: 'MẤT TẬP TRUNG NGUY HIỂM',
          dot: 'bg-red-500 animate-ping'
        };
      }
      return {
        bg: 'bg-orange-950/95 border-orange-600/90 text-orange-300 animate-pulse',
        text: 'CẢNH BÁO MẤT TẬP TRUNG',
        dot: 'bg-orange-400'
      };
    }
    switch (state) {
      case DrowsinessState.ALERT:
        return {
          bg: 'bg-emerald-950/90 border-emerald-600/80 text-emerald-300',
          text: 'TẬP TRUNG TỐT',
          dot: 'bg-emerald-400'
        };
      case DrowsinessState.TIRED:
        return {
          bg: 'bg-amber-950/90 border-amber-600/80 text-amber-300',
          text: 'DẤU HIỆU MỆT MỎI',
          dot: 'bg-amber-400 animate-pulse'
        };
      case DrowsinessState.WARNING:
        return {
          bg: 'bg-orange-950/95 border-orange-600/80 text-orange-300',
          text: 'CẢNH BÁO BUỒN NGỦ',
          dot: 'bg-orange-400'
        };
      case DrowsinessState.DANGER:
        return {
          bg: 'bg-red-950/95 border-red-600 text-red-200 animate-pulse',
          text: 'NGUY HIỂM - NGHỈ NGƠI',
          dot: 'bg-red-500 animate-ping'
        };
    }
  };

  const statusBadge = getStatusBadge();
  const activeSensitivityConfig = CONFIG.SENSITIVITY_PRESETS[sensitivityLevel] || CONFIG.SENSITIVITY_PRESETS[3];
  const presets: SensitivityLevel[] = [1, 2, 3, 4, 5];

  const handleSensitivityClick = (lvl: SensitivityLevel) => {
    if (onChangeSensitivity) onChangeSensitivity(lvl);
    if (onPlayFeedback) onPlayFeedback(lvl);
  };

  // Color config for active sensitivity pill
  const getSensitivityTheme = (lvl: SensitivityLevel) => {
    switch (lvl) {
      case 1:
        return { text: 'text-slate-200', bg: 'bg-slate-800/90', border: 'border-slate-500', ring: 'ring-slate-400' };
      case 2:
        return { text: 'text-emerald-200', bg: 'bg-emerald-950/90', border: 'border-emerald-500', ring: 'ring-emerald-400' };
      case 3:
        return { text: 'text-cyan-200', bg: 'bg-cyan-950/90', border: 'border-cyan-500', ring: 'ring-cyan-400' };
      case 4:
        return { text: 'text-amber-200', bg: 'bg-amber-950/90', border: 'border-amber-500', ring: 'ring-amber-400' };
      case 5:
        return { text: 'text-red-200', bg: 'bg-red-950/95', border: 'border-red-500', ring: 'ring-red-400' };
    }
  };

  const currentLevel: SensitivityLevel = (sensitivityLevel === 1 || sensitivityLevel === 2 || sensitivityLevel === 4 || sensitivityLevel === 5) ? sensitivityLevel : 3;
  const currentTheme = getSensitivityTheme(currentLevel);

  // Helper icon for distraction type
  const renderDistractionIcon = () => {
    if (!distractionMetrics) return null;
    switch (distractionMetrics.distractionType) {
      case 'TURN_LEFT':
        return <ArrowLeft className="w-4 h-4 text-orange-400 animate-pulse" />;
      case 'TURN_RIGHT':
        return <ArrowRight className="w-4 h-4 text-orange-400 animate-pulse" />;
      case 'LOOKING_DOWN':
        return <Smartphone className="w-4 h-4 text-amber-400 animate-bounce" />;
      case 'LOOKING_UP':
        return <Compass className="w-4 h-4 text-amber-400 animate-spin" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
    }
  };

  return (
    <div className={`relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[56vh] sm:max-h-none bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden border shadow-2xl flex items-center justify-center group transition-colors duration-300 ${
      distractionMetrics?.isDistracted
        ? distractionMetrics.distractionLevel === 'CRITICAL'
          ? 'border-red-500 shadow-red-950/50'
          : 'border-orange-500 shadow-orange-950/40'
        : 'border-slate-800'
    }`}>
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`w-full h-full object-cover transform -scale-x-100 ${
          isStreaming ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Canvas Overlay for Landmark Tracking */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100 z-10"
      />

      {/* Loading / Offline State Overlay */}
      {!isStreaming && (
        <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
            <Camera className="w-10 h-10 animate-pulse text-cyan-400" />
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-300">Đang khởi tạo nguồn camera...</p>
        </div>
      )}

      {/* Top Left Live Status Badge */}
      {isStreaming && (
        <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-20 flex flex-wrap items-center gap-1.5 sm:gap-2 pointer-events-none">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border backdrop-blur-md shadow-lg ${statusBadge.bg}`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusBadge.dot}`} />
            <span>{statusBadge.text}</span>
          </div>

          {!calibration.isCalibrated && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-medium bg-cyan-950/90 text-cyan-300 border border-cyan-700/80 backdrop-blur-md">
              {calibration.isCalibrating ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-cyan-400 shrink-0" />
                  <span>Đo mẫu ({calibration.samplesCount}/{CONFIG.CALIBRATION_FRAMES_REQUIRED})</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <span>Chờ hiệu chỉnh</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Top Right Live Telemetry Overlays */}
      {isStreaming && (
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20 flex flex-col items-end gap-1 text-[10px] sm:text-[11px] font-mono text-slate-200 pointer-events-none">
          <div className="bg-slate-950/85 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-800/80 flex items-center gap-1.5 sm:gap-2 shadow-md">
            <Eye className="w-3 h-3 text-cyan-400 shrink-0" />
            <span>EAR: {eyeMetrics.averageEar.toFixed(2)}</span>
            <span className="text-slate-500">•</span>
            <span>MAR: {yawnMetrics.mar.toFixed(2)}</span>
            {eyeMetrics.isClosed && (
              <span className="text-red-400 font-black text-[9px] sm:text-[10px] uppercase bg-red-950/90 px-1 rounded">
                NHẮM
              </span>
            )}
          </div>

          <div className="bg-slate-950/85 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-800/80 flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-300 shadow-md">
            <span>Quay: {headPose.yaw > 0 ? `+${headPose.yaw}` : headPose.yaw}°</span>
            <span>Cúi: {headPose.pitch}°</span>
          </div>

          {yawnMetrics.isYawning && (
            <div className={`backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border font-bold animate-pulse text-[10px] ${
              yawnMetrics.yawnCount >= 2
                ? 'bg-red-950/90 text-red-300 border-red-600 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                : 'bg-amber-950/90 text-amber-300 border-amber-700'
            }`}>
              {yawnMetrics.yawnCount >= 2
                ? `⚠️ CẢNH BÁO BUỒN NGỦ: NGÁP LẦN ${yawnMetrics.yawnCount}`
                : `😮 ĐANG NGÁP (LẦN ${yawnMetrics.yawnCount})`}
            </div>
          )}

          {headPose.isTurnedAway && (
            <div className="bg-amber-950/90 text-amber-300 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-amber-700 font-bold animate-pulse text-[10px]">
              👀 MẤT TẬP TRUNG (QUAY ĐẦU)
            </div>
          )}

          {(headPose.isHeadForward || headPose.pitch < -10) && (
            <div className={`backdrop-blur-md px-2 py-0.5 rounded-lg border font-bold text-[9px] sm:text-[10px] ${
              eyeMetrics.isClosed
                ? 'bg-red-950/90 text-red-300 border-red-700 animate-pulse'
                : 'bg-slate-900/80 text-amber-300 border-slate-700'
            }`}>
              {eyeMetrics.isClosed ? '⚠️ GỤC ĐẦU NGỦ' : '📱 Cúi nhìn (Mắt mở)'}
            </div>
          )}
        </div>
      )}

      {/* Dynamic Early Distraction HUD Banner */}
      {isStreaming && distractionMetrics?.isDistracted && (
        <div className="absolute top-12 sm:top-14 inset-x-3 sm:inset-x-6 z-25 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/90 border border-orange-500/80 backdrop-blur-md shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-orange-500/20 text-orange-400">
              {renderDistractionIcon()}
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-orange-300 uppercase tracking-wide flex items-center gap-1.5">
                <span>CẢNH BÁO MẤT TẬP TRUNG</span>
                <span className="text-[10px] font-mono font-normal text-orange-200/80 bg-orange-950/80 px-1.5 py-0.2 rounded border border-orange-800/80">
                  {(distractionMetrics.distractionDurationMs / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="text-[10px] text-slate-300 font-medium">
                {distractionMetrics.label} — Hãy nhìn thẳng quan sát đường!
              </div>
            </div>
          </div>
          <div className="w-12 sm:w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden shrink-0">
            <div
              className={`h-full transition-all duration-200 ${
                distractionMetrics.distractionLevel === 'CRITICAL' ? 'bg-red-500' : 'bg-orange-400'
              }`}
              style={{ width: `${Math.min(100, (distractionMetrics.distractionDurationMs / 3000) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Center Large Hazard Banner */}
      {isStreaming && primaryAlertReason === 'FACE_LOST' && (
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-red-950/95 border-2 border-red-500 text-center shadow-2xl backdrop-blur-md animate-pulse">
          <span className="text-base sm:text-xl font-black text-red-200 mb-0.5 uppercase tracking-wide">
            ⚠️ RỜI MẶT KHỎI CAMERA!
          </span>
          <span className="text-[11px] sm:text-xs text-slate-200 font-medium">
            Hãy nhìn thẳng vào camera và tập trung quan sát đường!
          </span>
        </div>
      )}

      {/* Ultra-compact Integrated In-Camera Floating Bar - 100% Fully Transparent HUD Style */}
      <div className="absolute inset-x-2.5 sm:inset-x-3 bottom-2 sm:bottom-2.5 z-20 flex items-center justify-between gap-1.5 sm:gap-2 px-1 py-0.5 bg-transparent border-0 text-[11px]">
        {/* Left: Minimal Face State & Attention */}
        <div className="flex items-center gap-1.5 shrink-0 px-1 sm:px-2 py-0.5 rounded-md bg-transparent">
          <span className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${
            faceDetected
              ? distractionMetrics?.isDistracted ? 'bg-orange-400 animate-pulse' : 'bg-emerald-400 animate-pulse'
              : 'bg-red-500 animate-ping'
          }`} />
          <span className={`text-[10px] sm:text-[11px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${
            faceDetected
              ? distractionMetrics?.isDistracted ? 'text-orange-300' : 'text-emerald-300'
              : 'text-red-400'
          }`}>
            {faceDetected
              ? distractionMetrics?.isDistracted
                ? distractionMetrics.label
                : 'Mặt: Nhìn thẳng'
              : 'Mất dấu mặt'}
          </span>
        </div>

        {/* Right: Ultra-sleek 5-Level Sensitivity Segment - Fully Transparent HUD with Mobile Touch-Friendly Targets */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] sm:text-[11px] text-white font-semibold hidden xs:inline mr-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            Độ nhạy:
          </span>
          <div className="flex items-center gap-1 bg-transparent p-0 border-0">
            {presets.map((lvl) => {
              const isSelected = sensitivityLevel === lvl;
              const theme = getSensitivityTheme(lvl);
              const presetConfig = CONFIG.SENSITIVITY_PRESETS[lvl];

              return (
                <button
                  key={lvl}
                  onClick={() => handleSensitivityClick(lvl)}
                  id={`btn-sens-level-${lvl}`}
                  title={`Mức ${lvl}: ${presetConfig.name} (${presetConfig.badge})`}
                  className={`w-7 h-6 sm:w-7 sm:h-6 rounded-md text-[11px] font-bold font-mono transition-all flex items-center justify-center cursor-pointer active:scale-90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${
                    isSelected
                      ? `${theme.bg} ${theme.border} ${theme.text} border ring-1 ${theme.ring} shadow-md`
                      : 'bg-transparent text-white/80 hover:text-white border border-white/25 hover:border-white/60 active:bg-white/10'
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border hidden sm:inline drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${currentTheme.bg} ${currentTheme.border} ${currentTheme.text}`}>
            {activeSensitivityConfig.name}
          </span>
        </div>
      </div>
    </div>
  );
};
