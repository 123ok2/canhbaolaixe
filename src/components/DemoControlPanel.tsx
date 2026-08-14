/**
 * Demo Simulation Control Panel Modal
 */

import { Activity, AlertTriangle, Eye, EyeOff, Moon, Smile, X } from 'lucide-react';
import React from 'react';
import { DemoModeState } from '../types';

interface DemoControlPanelProps {
  currentDemoMode: DemoModeState;
  onSelectDemoMode: (mode: DemoModeState) => void;
  onClose: () => void;
}

export const DemoControlPanel: React.FC<DemoControlPanelProps> = ({
  currentDemoMode,
  onSelectDemoMode,
  onClose
}) => {
  const modes: { id: DemoModeState; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'NORMAL',
      label: 'Mắt mở (Bình thường)',
      desc: 'Mô phỏng tài xế tỉnh táo, mắt mở bình thường.',
      icon: <Eye className="w-5 h-5 text-emerald-400" />,
      color: 'hover:border-emerald-500 hover:bg-emerald-950/30'
    },
    {
      id: 'EYES_CLOSED',
      label: 'Mắt nhắm kéo dài',
      desc: 'Mô phỏng mắt nhắm liên tục >1.2 giây.',
      icon: <EyeOff className="w-5 h-5 text-amber-400" />,
      color: 'hover:border-amber-500 hover:bg-amber-950/30'
    },
    {
      id: 'YAWNING',
      label: 'Ngáp liên tục',
      desc: 'Mô phỏng biên độ mở miệng lớn (MAR > 0.65).',
      icon: <Smile className="w-5 h-5 text-amber-400" />,
      color: 'hover:border-amber-500 hover:bg-amber-950/30'
    },
    {
      id: 'HEAD_DROP',
      label: 'Gục/Nghiêng đầu',
      desc: 'Mô phỏng đầu gục xuống góc Pitch < -20°.',
      icon: <Moon className="w-5 h-5 text-orange-400" />,
      color: 'hover:border-orange-500 hover:bg-orange-950/30'
    },
    {
      id: 'EXTREME_DANGER',
      label: 'Nguy hiểm tổng hợp',
      desc: 'Mô phỏng mắt nhắm + gục đầu + Drowsiness Score > 90.',
      icon: <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />,
      color: 'hover:border-red-500 hover:bg-red-950/30'
    },
    {
      id: 'OFF',
      label: 'Tắt Demo (Camera thật)',
      desc: 'Quay lại xử lý camera & landmark thực tế.',
      icon: <Activity className="w-5 h-5 text-cyan-400" />,
      color: 'hover:border-cyan-500 hover:bg-cyan-950/30'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Bảng điều khiển Giả lập (DEMO Mode)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300">
          Chọn trạng thái mô phỏng để trình diễn khả năng cảnh báo của DriveGuard AI mà không cần tài xế thật sự buồn ngủ:
        </p>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {modes.map((mode) => {
            const isSelected = currentDemoMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => {
                  onSelectDemoMode(mode.id);
                  onClose();
                }}
                className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-500 ring-1 ring-cyan-500'
                    : 'bg-slate-950/80 border-slate-800 ' + mode.color
                }`}
              >
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  {mode.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">
                      {mode.label}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-900 text-cyan-300 border border-cyan-700">
                        Đang chọn
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {mode.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-medium text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Đóng bảng điều khiển
          </button>
        </div>
      </div>
    </div>
  );
};
