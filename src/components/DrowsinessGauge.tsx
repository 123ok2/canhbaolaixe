/**
 * Circular Drowsiness Score Gauge (0 - 100) - Mobile & Desktop Optimized
 */

import { AlertCircle, Zap } from 'lucide-react';
import React from 'react';
import { DrowsinessState, EyeMetrics, HeadPoseMetrics, YawnMetrics } from '../types';

interface DrowsinessGaugeProps {
  score: number;
  state: DrowsinessState;
  eyeMetrics: EyeMetrics;
  yawnMetrics: YawnMetrics;
  headPose: HeadPoseMetrics;
}

export const DrowsinessGauge: React.FC<DrowsinessGaugeProps> = ({
  score,
  state,
  eyeMetrics,
  yawnMetrics,
  headPose
}) => {
  // Map score 0-100 to SVG dash offset
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const getGaugeColors = () => {
    if (clampedScore <= 30) {
      return {
        stroke: '#10b981', // Emerald
        glow: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.45))',
        label: 'Tỉnh táo',
        badgeBg: 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300'
      };
    } else if (clampedScore <= 60) {
      return {
        stroke: '#f59e0b', // Amber
        glow: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.45))',
        label: 'Mệt mỏi',
        badgeBg: 'bg-amber-950/80 border-amber-600/80 text-amber-300'
      };
    } else if (clampedScore <= 80) {
      return {
        stroke: '#f97316', // Orange
        glow: 'drop-shadow(0 0 12px rgba(249, 115, 22, 0.5))',
        label: 'Cảnh báo',
        badgeBg: 'bg-orange-950/80 border-orange-600/80 text-orange-300'
      };
    } else {
      return {
        stroke: '#ef4444', // Red
        glow: 'drop-shadow(0 0 14px rgba(239, 68, 68, 0.75))',
        label: 'Nguy hiểm',
        badgeBg: 'bg-red-950/90 border-red-600 text-red-200 animate-pulse'
      };
    }
  };

  const colors = getGaugeColors();

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col items-center justify-between space-y-3 sm:space-y-4">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
            Chỉ số Buồn ngủ
          </h2>
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${colors.badgeBg}`}>
          {colors.label}
        </span>
      </div>

      {/* Responsive SVG Circular Gauge */}
      <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center my-0.5 sm:my-1">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          {/* Background Ring */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="11"
            className="text-slate-800/80"
            fill="transparent"
          />
          {/* Progress Ring */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={colors.stroke}
            strokeWidth="11"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 0.35s ease, stroke 0.35s ease',
              filter: colors.glow
            }}
          />
        </svg>

        {/* Center Score Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
            {clampedScore}
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 font-mono uppercase tracking-widest mt-0.5">
            / 100 điểm
          </span>
        </div>
      </div>

      {/* Threshold Guide Scale */}
      <div className="w-full grid grid-cols-4 gap-1 text-[9px] sm:text-[10px] text-center font-mono pt-0.5">
        <div className="py-1 px-0.5 rounded bg-slate-950/80 border border-slate-800 text-emerald-400 font-medium">
          0-30 Tỉnh
        </div>
        <div className="py-1 px-0.5 rounded bg-slate-950/80 border border-slate-800 text-amber-400 font-medium">
          31-60 Mệt
        </div>
        <div className="py-1 px-0.5 rounded bg-slate-950/80 border border-slate-800 text-orange-400 font-medium">
          61-80 Báo
        </div>
        <div className="py-1 px-0.5 rounded bg-slate-950/80 border border-slate-800 text-red-400 font-bold">
          81-100 Đỏ
        </div>
      </div>

      {/* Live Biometric Indicators Grid */}
      <div className="w-full border-t border-slate-800/80 pt-2.5 grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs">
        <div className="p-1.5 sm:p-2 rounded-xl bg-slate-950/70 border border-slate-800/90">
          <div className="text-[9px] sm:text-[10px] text-cyan-400 font-mono font-medium">EAR (Mắt)</div>
          <div className="font-bold text-slate-200 mt-0.5 font-mono text-xs sm:text-sm">
            {eyeMetrics.averageEar.toFixed(2)}
          </div>
        </div>

        <div className="p-1.5 sm:p-2 rounded-xl bg-slate-950/70 border border-slate-800/90">
          <div className="text-[9px] sm:text-[10px] text-amber-400 font-mono font-medium">MAR (Miệng)</div>
          <div className="font-bold text-slate-200 mt-0.5 font-mono text-xs sm:text-sm">
            {yawnMetrics.mar.toFixed(2)}
          </div>
        </div>

        <div className="p-1.5 sm:p-2 rounded-xl bg-slate-950/70 border border-slate-800/90">
          <div className="text-[9px] sm:text-[10px] text-purple-400 font-mono font-medium">Góc cúi</div>
          <div className={`font-bold mt-0.5 font-mono text-xs sm:text-sm ${headPose.pitch < -12 ? 'text-red-400' : 'text-slate-200'}`}>
            {headPose.pitch}°
          </div>
        </div>
      </div>
    </div>
  );
};
