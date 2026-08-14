/**
 * App Header Bar
 */

import { Activity, AlertTriangle, Eye, RefreshCw, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import React from 'react';
import { DrowsinessState } from '../types';

interface HeaderProps {
  currentState: DrowsinessState;
  score: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenDemo: () => void;
  onRecalibrate?: () => void;
  isEnhancedMonitoring: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentState,
  score,
  isMuted,
  onToggleMute,
  onOpenDemo,
  onRecalibrate,
  isEnhancedMonitoring
}) => {
  const getStateBadge = () => {
    switch (currentState) {
      case DrowsinessState.ALERT:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shadow-sm shadow-emerald-900/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            TỈNH TÁO ({score})
          </span>
        );
      case DrowsinessState.TIRED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/60 shadow-sm shadow-amber-900/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            CÓ DẤU HIỆU MỆT MỎI ({score})
          </span>
        );
      case DrowsinessState.WARNING:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-950/80 text-orange-400 border border-orange-800/60 shadow-sm shadow-orange-900/30">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
            NGUY CƠ BUỒN NGỦ ({score})
          </span>
        );
      case DrowsinessState.DANGER:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-950/90 text-red-400 border border-red-700/80 shadow-md shadow-red-900/50 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-bounce" />
            NGUY HIỂM CAO ({score})
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-950/40">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white font-mono">
                Drive<span className="text-cyan-400">Guard</span> <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-1.5 py-0.5 rounded font-sans">AI</span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Phát hiện & Cảnh báo buồn ngủ tài xế realtime
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isEnhancedMonitoring && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 px-2.5 py-1 rounded-full">
              <Eye className="w-3 h-3 text-indigo-400" />
              Theo dõi tăng cường
            </span>
          )}

          {getStateBadge()}

          {/* Recalibrate Button */}
          {onRecalibrate && (
            <button
              onClick={onRecalibrate}
              id="btn-recalibrate"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition-colors"
              title="Hiệu chỉnh lại khuôn mặt"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Hiệu chỉnh</span>
            </button>
          )}

          {/* Demo Mode Button */}
          <button
            onClick={onOpenDemo}
            id="btn-demo-mode"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Chế độ Giả lập / DEMO"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>DEMO</span>
          </button>

          {/* Audio Mute Button */}
          <button
            onClick={onToggleMute}
            id="btn-audio-mute"
            className={`p-2 rounded-lg border transition-colors ${
              isMuted
                ? 'bg-red-950/50 border-red-800/60 text-red-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={isMuted ? 'Mở âm thanh cảnh báo' : 'Tắt âm thanh cảnh báo'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
