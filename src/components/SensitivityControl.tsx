/**
 * Sensitivity Adjustment Slider & Control Widget for DriveGuard AI
 * Allows drivers to customize alertness trigger responsiveness in real time.
 */

import { Check, ChevronDown, ChevronUp, Clock, Compass, Eye, Info, ShieldAlert, Sliders, Sparkles, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { CONFIG } from '../config/constants';
import { SensitivityLevel } from '../types';

interface SensitivityControlProps {
  currentLevel: SensitivityLevel;
  onChangeSensitivity: (level: SensitivityLevel) => void;
  onPlayFeedback?: (level: SensitivityLevel) => void;
}

export const SensitivityControl: React.FC<SensitivityControlProps> = ({
  currentLevel,
  onChangeSensitivity,
  onPlayFeedback
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const activeConfig = CONFIG.SENSITIVITY_PRESETS[currentLevel] || CONFIG.SENSITIVITY_PRESETS[3];

  const presets: SensitivityLevel[] = [1, 2, 3, 4, 5];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10) as SensitivityLevel;
    onChangeSensitivity(val);
    onPlayFeedback?.(val);
  };

  const handlePresetClick = (level: SensitivityLevel) => {
    onChangeSensitivity(level);
    onPlayFeedback?.(level);
  };

  // Color mapping based on sensitivity level
  const getLevelColor = (level: SensitivityLevel) => {
    switch (level) {
      case 1:
        return {
          text: 'text-slate-300',
          bg: 'bg-slate-800',
          border: 'border-slate-700',
          accent: 'text-slate-400',
          glow: 'from-slate-700 to-slate-900',
          sliderColor: '#64748b'
        };
      case 2:
        return {
          text: 'text-emerald-400',
          bg: 'bg-emerald-950/60',
          border: 'border-emerald-700/60',
          accent: 'text-emerald-300',
          glow: 'from-emerald-600 to-teal-800',
          sliderColor: '#10b981'
        };
      case 3:
        return {
          text: 'text-cyan-400',
          bg: 'bg-cyan-950/70',
          border: 'border-cyan-500/80 ring-1 ring-cyan-500/40',
          accent: 'text-cyan-300',
          glow: 'from-cyan-500 to-blue-700',
          sliderColor: '#06b6d4'
        };
      case 4:
        return {
          text: 'text-amber-400',
          bg: 'bg-amber-950/70',
          border: 'border-amber-600/70 ring-1 ring-amber-500/30',
          accent: 'text-amber-300',
          glow: 'from-amber-500 to-orange-700',
          sliderColor: '#f59e0b'
        };
      case 5:
        return {
          text: 'text-red-400',
          bg: 'bg-red-950/80',
          border: 'border-red-600 ring-1 ring-red-500/50 shadow-md shadow-red-900/40',
          accent: 'text-red-300',
          glow: 'from-red-500 to-rose-700',
          sliderColor: '#ef4444'
        };
    }
  };

  const levelTheme = getLevelColor(currentLevel);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md relative overflow-hidden">
      {/* Background Subtle Gradient Accent */}
      <div className={`absolute top-0 right-0 w-72 h-32 bg-gradient-to-l ${levelTheme.glow} opacity-10 rounded-full blur-3xl pointer-events-none transition-all duration-300`} />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Độ nhạy Cảnh báo Buồn ngủ
              </h3>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${levelTheme.bg} ${levelTheme.border} ${levelTheme.text} transition-all`}>
                Mức {currentLevel}: {activeConfig.name}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Tùy chỉnh tốc độ phản ứng của AI khi phát hiện nhắm mắt & gục đầu
            </p>
          </div>
        </div>

        {/* Quick Recommended Badge & Expand Button */}
        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{activeConfig.badge}</span>
          </span>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            title="Chi tiết thông số"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Interactive Slider Row */}
      <div className="space-y-3 py-1">
        {/* Slider Input with Dynamic Background Glow */}
        <div className="relative px-1">
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={currentLevel}
            onChange={handleSliderChange}
            id="sensitivity-range-slider"
            aria-label="Điều chỉnh độ nhạy cảnh báo"
            className="w-full h-3 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            style={{
              background: `linear-gradient(to right, #64748b 0%, #10b981 25%, #06b6d4 50%, #f59e0b 75%, #ef4444 100%)`
            }}
          />

          {/* Slider Step Scale Markers */}
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 px-1 mt-1">
            <span>1 (Rất thấp)</span>
            <span>2 (Thấp)</span>
            <span className="text-cyan-400 font-bold">3 (Chuẩn)</span>
            <span>4 (Cao)</span>
            <span className="text-red-400 font-bold">5 (Cực nhạy)</span>
          </div>
        </div>

        {/* 5 Preset Quick-Select Buttons */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1">
          {presets.map((lvl) => {
            const config = CONFIG.SENSITIVITY_PRESETS[lvl];
            const isSelected = currentLevel === lvl;
            const theme = getLevelColor(lvl);

            return (
              <button
                key={lvl}
                onClick={() => handlePresetClick(lvl)}
                className={`py-2 px-1 sm:px-2 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 border ${
                  isSelected
                    ? `${theme.bg} ${theme.border} text-white shadow-lg`
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className={`text-xs sm:text-sm font-bold font-mono ${isSelected ? theme.text : ''}`}>
                    Mức {lvl}
                  </span>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-[10px] sm:text-[11px] truncate max-w-full font-medium">
                  {config.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Summary Card for Current Active Level */}
      <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 font-medium text-slate-200">
            <Zap className={`w-3.5 h-3.5 ${levelTheme.text}`} />
            <span>{activeConfig.description}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            <strong className="text-cyan-400">Phù hợp nhất:</strong> {activeConfig.recommendedFor}
          </p>
        </div>

        {/* Quick Micro-Metrics */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 font-mono text-[11px]">
          <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1">
            <Eye className="w-3 h-3 text-cyan-400" />
            <span>{(activeConfig.minEyeCloseMs / 1000).toFixed(2)}s</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1">
            <Compass className="w-3 h-3 text-purple-400" />
            <span>{activeConfig.pitchThreshold}°</span>
          </div>
        </div>
      </div>

      {/* Expanded Details Section: Realtime Trigger Threshold Matrix */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono animate-in fade-in duration-200">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Eye className="w-3 h-3 text-cyan-400" />
              <span>Nhắm mắt cảnh báo</span>
            </div>
            <div className="text-sm font-bold text-white mt-1">
              &ge; {activeConfig.minEyeCloseMs} ms ({activeConfig.minEyeCloseMs / 1000}s)
            </div>
            <span className="text-[9px] text-slate-500">Kích hoạt còi cấp 2</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Compass className="w-3 h-3 text-purple-400" />
              <span>Góc gục đầu / Nghiêng</span>
            </div>
            <div className="text-sm font-bold text-purple-300 mt-1">
              Pitch &le; {activeConfig.pitchThreshold}°
            </div>
            <span className="text-[9px] text-slate-500">Giữ &ge; {activeConfig.minHeadDropMs}ms</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>Rời mặt camera</span>
            </div>
            <div className="text-sm font-bold text-amber-300 mt-1">
              &ge; {activeConfig.faceLostMs} ms ({activeConfig.faceLostMs / 1000}s)
            </div>
            <span className="text-[9px] text-slate-500">Mất tập trung lái</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Hệ số tích lũy điểm</span>
            </div>
            <div className="text-sm font-bold text-emerald-300 mt-1">
              {activeConfig.scoreMultiplier}x Tốc độ
            </div>
            <span className="text-[9px] text-slate-500">Tăng điểm cảnh báo</span>
          </div>
        </div>
      )}
    </div>
  );
};
