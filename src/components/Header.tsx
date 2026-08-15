/**
 * App Header Bar - Optimized for Mobile & Desktop
 */

import { Activity, AlertTriangle, Eye, RefreshCw, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import React from 'react';
import { DrowsinessState, SensitivityLevel } from '../types';

interface HeaderProps {
  currentState: DrowsinessState;
  score: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenDemo?: () => void;
  onRecalibrate?: () => void;
  isEnhancedMonitoring: boolean;
  sensitivityLevel?: SensitivityLevel;
}

export const Header: React.FC<HeaderProps> = ({
  currentState,
  score,
  isMuted,
  onToggleMute,
  onRecalibrate,
  isEnhancedMonitoring,
  sensitivityLevel = 3
}) => {
  const getStateBadge = () => {
    switch (currentState) {
      case DrowsinessState.ALERT:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/70 shadow-sm shadow-emerald-950/50 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span>TỈNH TÁO</span>
            <span className="font-mono text-emerald-400/90">({score})</span>
          </span>
        );
      case DrowsinessState.TIRED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-amber-950/90 text-amber-300 border border-amber-600/80 shadow-sm shadow-amber-950/50 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
            <span>MỆT MỎI</span>
            <span className="font-mono text-amber-400/90">({score})</span>
          </span>
        );
      case DrowsinessState.WARNING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-orange-950/90 text-orange-300 border border-orange-600/80 shadow-sm shadow-orange-950/50 whitespace-nowrap">
            <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-400 shrink-0" />
            <span>BUỒN NGỦ</span>
            <span className="font-mono text-orange-400/90">({score})</span>
          </span>
        );
      case DrowsinessState.DANGER:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-red-950/95 text-red-200 border border-red-600 shadow-md shadow-red-950/80 animate-pulse whitespace-nowrap">
            <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400 animate-bounce shrink-0" />
            <span>NGUY HIỂM</span>
            <span className="font-mono text-red-300">({score})</span>
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800/90 px-3 sm:px-6 py-2 sm:py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 p-0.5 flex items-center justify-center shadow-md shadow-cyan-950/50">
            <div className="w-full h-full bg-slate-950 rounded-[9px] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white font-mono leading-none">
                Drive<span className="text-cyan-400">Guard</span>
              </h1>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-1 py-0.2 rounded font-mono font-bold leading-none">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden md:block mt-0.5">
              Phát hiện & Cảnh báo buồn ngủ realtime
            </p>
          </div>
        </div>

        {/* Right: Actions & Status Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Enhanced Monitoring Pill */}
          {isEnhancedMonitoring && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-950/90 text-indigo-300 border border-indigo-700/80 px-2.5 py-1 rounded-full whitespace-nowrap">
              <Eye className="w-3 h-3 text-indigo-400" />
              <span>Tăng cường</span>
            </span>
          )}

          {/* Sensitivity Indicator Pill (Tablet/Desktop) */}
          <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-medium bg-slate-900 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-full font-mono whitespace-nowrap">
            <span className="text-cyan-400 font-bold">Mức {sensitivityLevel}</span>
          </span>

          {/* Drowsiness State Badge */}
          {getStateBadge()}

          {/* Recalibrate Button */}
          {onRecalibrate && (
            <button
              onClick={onRecalibrate}
              id="btn-recalibrate"
              className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 hover:border-cyan-500/50 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Hiệu chỉnh lại khuôn mặt"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden md:inline">Hiệu chỉnh</span>
            </button>
          )}

          {/* Audio Mute Button */}
          <button
            onClick={onToggleMute}
            id="btn-audio-mute"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              isMuted
                ? 'bg-red-950/70 border-red-700 text-red-300'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
            }`}
            title={isMuted ? 'Mở âm thanh cảnh báo' : 'Tắt âm thanh cảnh báo'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 shrink-0" /> : <Volume2 className="w-4 h-4 shrink-0" />}
          </button>
        </div>
      </div>
    </header>
  );
};
