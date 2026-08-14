/**
 * Interactive Calibration Overlay & Guidance Modal
 * Allows driver to securely mount / fix the camera first, then press "BẮT ĐẦU HIỆU CHỈNH" when ready.
 */

import { CheckCircle2, Eye, Play, RefreshCw, Smartphone, Smile, Sparkles, Target } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { CONFIG } from '../config/constants';
import { CalibrationData } from '../types';

interface CalibrationModalProps {
  isStreaming: boolean;
  hasLandmarks: boolean;
  calibration: CalibrationData;
  onBeginCalibration: () => void;
  onSkip: () => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isStreaming,
  hasLandmarks,
  calibration,
  onBeginCalibration,
  onSkip
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);

  // Handle 3-second countdown before sampling begins
  const handleStartCountdown = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (countdown === 0) {
      setCountdown(null);
      onBeginCalibration();
    }
  }, [countdown, onBeginCalibration]);

  // If calibrated or camera not streaming, don't render UI
  if (calibration.isCalibrated || !isStreaming) return null;

  const totalFrames = CONFIG.CALIBRATION_FRAMES_REQUIRED;
  const currentCount = Math.min(totalFrames, calibration.samplesCount);
  const progressPercent = Math.round((currentCount / totalFrames) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-cyan-500/50 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-cyan-950/60 overflow-hidden text-center">
        {/* Glow background accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-3">
          <Target className="w-3.5 h-3.5" />
          <span>Bước 1: Cố định vị trí Camera & Hiệu chỉnh</span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Hiệu chỉnh Khuôn mặt
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed max-w-md mx-auto">
          Hãy gắn cố định điện thoại lên giá đỡ xe trước. Khi đã ngồi đúng tư thế lái xe và nhìn thẳng camera, bấm nút bên dưới để AI bắt đầu đo thông số.
        </p>

        {/* Step Guide Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6 text-left">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-2 font-bold text-xs">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-200 block">1. Cố định Camera</span>
              <span className="text-[11px] text-slate-400">Gắn giá đỡ thẳng tầm mắt tài xế.</span>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-2 font-bold text-xs">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-200 block">2. Mở mắt tự nhiên</span>
              <span className="text-[11px] text-slate-400">Nhìn thẳng vào đường/camera.</span>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-2 font-bold text-xs">
              <Smile className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-200 block">3. Khép miệng</span>
              <span className="text-[11px] text-slate-400">Thả lỏng cơ miệng trong 2s.</span>
            </div>
          </div>
        </div>

        {/* Face Landmark Detection Status Hint */}
        <div className="mb-5 flex items-center justify-center gap-2 text-xs">
          <span className={`w-2.5 h-2.5 rounded-full ${hasLandmarks ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
          <span className={hasLandmarks ? 'text-emerald-300 font-medium' : 'text-amber-300 font-medium'}>
            {hasLandmarks ? '✓ Đã phát hiện khuôn mặt sẵn sàng' : '⚠️ Hãy hướng khuôn mặt vào giữa khung camera'}
          </span>
        </div>

        {/* Calibration Progress or Countdown State */}
        {countdown !== null ? (
          <div className="py-4 space-y-2">
            <div className="text-4xl font-black text-cyan-400 animate-bounce">{countdown}</div>
            <p className="text-xs text-slate-300">Chuẩn bị nhìn thẳng vào camera...</p>
          </div>
        ) : calibration.isCalibrating ? (
          <div className="space-y-2 mb-6 bg-slate-950/60 p-4 rounded-2xl border border-cyan-500/30">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-300 font-semibold flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                Đang đo kích thước mắt & miệng ({currentCount}/{totalFrames})
              </span>
              <span className="text-cyan-400 font-bold text-sm">{progressPercent}%</span>
            </div>

            <div className="w-full h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-150 shadow-md shadow-cyan-500/50"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : (
          /* Big Ready Action Button */
          <div className="space-y-3 mb-2">
            <button
              onClick={handleStartCountdown}
              id="btn-start-calibration-sampling"
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-600 hover:from-cyan-400 hover:via-blue-500 hover:to-cyan-500 text-slate-950 font-black text-base uppercase tracking-wider shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
            >
              <Play className="w-5 h-5 fill-slate-950 text-slate-950" />
              <span>ĐÃ CỐ ĐỊNH XONG - BẮT ĐẦU HIỆU CHỈNH</span>
            </button>

            <button
              onClick={onSkip}
              id="btn-skip-calibration"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700/60 transition flex items-center justify-center gap-1.5"
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
