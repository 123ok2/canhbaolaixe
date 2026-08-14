/**
 * Real-time Camera Feed with High-Performance Canvas Overlay for Facial Landmarks
 */

import { Camera, Eye, RefreshCw } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { CONFIG } from '../config/constants';
import { CalibrationData, DrowsinessState, EyeMetrics, HeadPoseMetrics, YawnMetrics } from '../types';

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
  headPose
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

    // Determine overlay color scheme based on state
    let overlayColor = '#10b981'; // Emerald Green
    let glowColor = 'rgba(16, 185, 129, 0.4)';
    if (state === DrowsinessState.TIRED) {
      overlayColor = '#f59e0b'; // Amber
      glowColor = 'rgba(245, 158, 11, 0.4)';
    } else if (state === DrowsinessState.WARNING) {
      overlayColor = '#f97316'; // Orange
      glowColor = 'rgba(249, 115, 22, 0.4)';
    } else if (state === DrowsinessState.DANGER) {
      overlayColor = '#ef4444'; // Red
      glowColor = 'rgba(239, 68, 68, 0.6)';
    }

    ctx.lineWidth = 1.8;
    ctx.strokeStyle = overlayColor;
    ctx.fillStyle = overlayColor;

    // Helper function to draw continuous point array contour loops
    const drawLoopPath = (pointIndices: number[], isClosed: boolean = true) => {
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
      ctx.stroke();
    };

    // 1. Draw Left Eye continuous contour
    drawLoopPath(CONFIG.FACEMESH_LEFT_EYE_CONTOUR, true);

    // 2. Draw Right Eye continuous contour
    drawLoopPath(CONFIG.FACEMESH_RIGHT_EYE_CONTOUR, true);

    // 3. Draw Mouth Outer and Inner contours
    drawLoopPath(CONFIG.FACEMESH_MOUTH_OUTER, true);
    drawLoopPath(CONFIG.FACEMESH_MOUTH_INNER, true);

    // 4. Draw Nose Bridge
    drawLoopPath(CONFIG.FACEMESH_NOSE_BRIDGE, false);

    // 5. Draw Face Oval contour with subtle opacity
    ctx.globalAlpha = 0.6;
    drawLoopPath(CONFIG.FACEMESH_FACE_OVAL, true);
    ctx.globalAlpha = 1.0;

    // 6. Draw key facial anchor dots with subtle glowing
    ctx.shadowBlur = 6;
    ctx.shadowColor = glowColor;

    const keyPoints = CONFIG.FACEMESH_KEY_FACE;
    keyPoints.forEach((idx) => {
      const pt = landmarks[idx];
      if (pt) {
        ctx.beginPath();
        ctx.arc(pt.x * width, pt.y * height, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Reset shadow blur
    ctx.shadowBlur = 0;

    // 7. Highlight eyes if closed
    if (eyeMetrics.isClosed) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      const leftPt = landmarks[33];
      const rightPt = landmarks[263];
      const topPt = landmarks[10];
      if (leftPt && rightPt && topPt) {
        const minX = Math.min(leftPt.x, rightPt.x) * width - 15;
        const maxX = Math.max(leftPt.x, rightPt.x) * width + 15;
        const eyeY = ((leftPt.y + rightPt.y) / 2) * height - 15;
        ctx.fillRect(minX, eyeY, maxX - minX, 30);
      }
    }
  }, [landmarks, isStreaming, state, eyeMetrics, videoRef]);

  const getStatusBadge = () => {
    switch (state) {
      case DrowsinessState.ALERT:
        return {
          bg: 'bg-emerald-950/90 border-emerald-600/80 text-emerald-300',
          text: '🟢 TỈNH TÁO',
          dot: 'bg-emerald-400'
        };
      case DrowsinessState.TIRED:
        return {
          bg: 'bg-amber-950/90 border-amber-600/80 text-amber-300',
          text: '🟡 CÓ DẤU HIỆU BUỒN NGỦ',
          dot: 'bg-amber-400'
        };
      case DrowsinessState.WARNING:
        return {
          bg: 'bg-orange-950/90 border-orange-600/80 text-orange-300',
          text: '🟠 NGUY CƠ BUỒN NGỦ CAO',
          dot: 'bg-orange-400'
        };
      case DrowsinessState.DANGER:
        return {
          bg: 'bg-red-950/95 border-red-600 text-red-200 animate-pulse',
          text: '🔴 NGUY HIỂM - DỪNG XE NGHỈ NGƠI',
          dot: 'bg-red-500 animate-ping'
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group">
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
        className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 z-10"
      />

      {/* Loading / Offline State Overlay */}
      {!isStreaming && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500">
            <Camera className="w-10 h-10 animate-pulse text-cyan-500" />
          </div>
          <p className="text-sm font-medium text-slate-300">Đang khởi tạo nguồn camera...</p>
        </div>
      )}

      {/* Top Left Live Status Badge */}
      {isStreaming && (
        <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md shadow-lg ${statusBadge.bg}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
            <span>{statusBadge.text}</span>
          </div>

          {!calibration.isCalibrated && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-cyan-950/90 text-cyan-300 border border-cyan-700/80 backdrop-blur-md">
              {calibration.isCalibrating ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                  <span>Đang đo mẫu khuôn mặt ({calibration.samplesCount}/{CONFIG.CALIBRATION_FRAMES_REQUIRED})</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Chờ bấm bắt đầu hiệu chỉnh</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Top Right Live Metrics Overlays */}
      {isStreaming && (
        <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5 text-[11px] font-mono text-slate-300">
          <div className="bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800/80 flex items-center gap-2">
            <Eye className="w-3 h-3 text-cyan-400" />
            <span>EAR: {(eyeMetrics.averageEar).toFixed(2)}</span>
            <span>MAR: {(yawnMetrics.mar).toFixed(2)}</span>
            {eyeMetrics.isClosed && <span className="text-red-400 font-bold text-[10px] uppercase">NHẮM MẮT</span>}
          </div>

          <div className="bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800/80 flex items-center gap-2 text-[10px] text-slate-400">
            <span>Gật: {headPose.pitch}°</span>
            <span>Nghiêng: {headPose.roll}°</span>
            <span>Xoay: {headPose.yaw}°</span>
          </div>

          {yawnMetrics.isYawning && (
            <div className="bg-amber-950/90 text-amber-300 backdrop-blur-md px-2.5 py-1 rounded-lg border border-amber-700/80 font-bold animate-pulse">
              😮 PHÁT HIỆN NGÁP
            </div>
          )}

          {(headPose.isHeadForward || headPose.pitch < -10) && (
            <div className="bg-red-950/90 text-red-300 backdrop-blur-md px-2.5 py-1 rounded-lg border border-red-700/80 font-bold animate-pulse">
              ⚠️ GỤC ĐẦU VỀ PHÍA TRƯỚC
            </div>
          )}

          {(headPose.isTiltLeft || headPose.roll < -18) && (
            <div className="bg-orange-950/90 text-orange-300 backdrop-blur-md px-2.5 py-1 rounded-lg border border-orange-700/80 font-bold animate-pulse">
              ⚠️ NGHIÊNG ĐẦU SANG TRÁI
            </div>
          )}

          {(headPose.isTiltRight || headPose.roll > 18) && (
            <div className="bg-orange-950/90 text-orange-300 backdrop-blur-md px-2.5 py-1 rounded-lg border border-orange-700/80 font-bold animate-pulse">
              ⚠️ NGHIÊNG ĐẦU SANG PHẢI
            </div>
          )}

          {(headPose.isTurnedAway || Math.abs(headPose.yaw) > 25) && (
            <div className="bg-amber-950/90 text-amber-300 backdrop-blur-md px-2.5 py-1 rounded-lg border border-amber-700/80 font-bold animate-pulse">
              ⚠️ NGOẢNH MẶT RỜI ĐƯỜNG
            </div>
          )}
        </div>
      )}

      {/* Bottom Face Tracking Frame Guide */}
      <div className="absolute inset-x-8 bottom-4 z-20 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span className="bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800/80 backdrop-blur-md">
          {landmarks ? '✓ Đã nhận diện khuôn mặt' : '⚠️ Vui lòng nhìn thẳng camera'}
        </span>
        <span className="bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800/80 backdrop-blur-md">
          Chế độ ban đêm: Tự động
        </span>
      </div>
    </div>
  );
};
