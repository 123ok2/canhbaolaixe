/**
 * Circular Drowsiness Score Gauge (0 - 100)
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
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const getGaugeColors = () => {
    if (clampedScore <= 30) {
      return {
        stroke: '#10b981', // Emerald
        glow: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.5))',
        label: 'Tỉnh táo',
        badgeBg: 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
      };
    } else if (clampedScore <= 60) {
      return {
        stroke: '#f59e0b', // Amber
        glow: 'drop-shadow(0 0 12px rgba(245, 158, 11, 0.5))',
        label: 'Mệt mỏi',
        badgeBg: 'bg-amber-950/80 border-amber-800 text-amber-300'
      };
    } else if (clampedScore <= 80) {
      return {
        stroke: '#f97316', // Orange
        glow: 'drop-shadow(0 0 12px rgba(249, 115, 22, 0.5))',
        label: 'Nguy cơ cao',
        badgeBg: 'bg-orange-950/80 border-orange-800 text-orange-300'
      };
    } else {
      return {
        stroke: '#ef4444', // Red
        glow: 'drop-shadow(0 0 16px rgba(239, 68, 68, 0.8))',
        label: 'Nguy hiểm',
        badgeBg: 'bg-red-950/90 border-red-700 text-red-200'
      };
    }
  };

  const colors = getGaugeColors();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col items-center justify-between space-y-4">
      <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
            Drowsiness Score
          </h2>
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${colors.badgeBg}`}>
          {colors.label}
        </span>
      </div>

      {/* SVG Gauge */}
      <div className="relative w-44 h-44 flex items-center justify-center my-1">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background Ring */}
          <circle
            cx="88"
            cy="88"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            className="text-slate-800/80"
            fill="transparent"
          />
          {/* Progress Ring */}
          <circle
            cx="88"
            cy="88"
            r={radius}
            stroke={colors.stroke}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 0.4s ease, stroke 0.4s ease',
              filter: colors.glow
            }}
          />
        </svg>

        {/* Center Score Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-black text-white font-mono tracking-tight">
            {clampedScore}
          </span>
          <span className="text-[11px] font-medium text-slate-400 font-mono uppercase tracking-widest mt-0.5">
            / 100
          </span>
        </div>
      </div>

      {/* Threshold Guide Scale */}
      <div className="w-full grid grid-cols-4 gap-1 text-[10px] text-center font-mono pt-1">
        <div className="p-1 rounded bg-slate-950/80 border border-slate-800 text-emerald-400">
          0-30 Tỉnh
        </div>
        <div className="p-1 rounded bg-slate-950/80 border border-slate-800 text-amber-400">
          31-60 Mệt
        </div>
        <div className="p-1 rounded bg-slate-950/80 border border-slate-800 text-orange-400">
          61-80 Cao
        </div>
        <div className="p-1 rounded bg-slate-950/80 border border-slate-800 text-red-400 font-bold">
          81-100 Đỏ
        </div>
      </div>

      {/* Live Biometric Indicators */}
      <div className="w-full border-t border-slate-800/80 pt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] text-slate-400 font-mono">EAR (Mắt)</div>
          <div className="font-bold text-slate-200 mt-0.5 font-mono">
            {eyeMetrics.averageEar.toFixed(2)}
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] text-slate-400 font-mono">MAR (Miệng)</div>
          <div className="font-bold text-slate-200 mt-0.5 font-mono">
            {yawnMetrics.mar.toFixed(2)}
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] text-slate-400 font-mono">Góc cúi</div>
          <div className={`font-bold mt-0.5 font-mono ${headPose.pitch < -18 ? 'text-red-400' : 'text-slate-200'}`}>
            {headPose.pitch}°
          </div>
        </div>
      </div>
    </div>
  );
};
