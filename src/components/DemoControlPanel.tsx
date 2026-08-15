/**
 * Demo Simulation Control Panel Modal
 */

import { Activity, AlertTriangle, Eye, EyeOff, Moon, Smile, Square, Volume2, X, Zap } from 'lucide-react';
import React from 'react';
import { DemoModeState } from '../types';

interface DemoControlPanelProps {
  currentDemoMode: DemoModeState;
  onSelectDemoMode: (mode: DemoModeState) => void;
  onClose: () => void;
  onTestSound?: (fileName: string, loop?: boolean) => void;
  onStopSound?: () => void;
  isPlayingEmergency?: boolean;
}

export const DemoControlPanel: React.FC<DemoControlPanelProps> = ({
  currentDemoMode,
  onSelectDemoMode,
  onClose,
  onTestSound,
  onStopSound,
  isPlayingEmergency = false
}) => {
  const soundTests: { name: string; file: string; text: string; badge: string; color: string; loop?: boolean }[] = [
    {
      name: '🚨 Còi hú khẩn cấp liên tục',
      file: 'alert_khan_cap_lien_tuc.mp3',
      text: '(Còi hú dồn dập) + "Khẩn cấp! Nguy hiểm cực độ! Tỉnh dậy ngay, dừng xe lập tức!"',
      badge: 'Lặp liên tục',
      color: 'bg-red-950 border-red-500 text-red-100 hover:bg-red-900 shadow-md col-span-1 sm:col-span-2 ring-1 ring-red-500/50',
      loop: true
    },
    {
      name: '1. Gục đầu',
      file: 'alert_guc_dau.mp3',
      text: 'Cảnh báo! Phát hiện gục đầu, hãy ngẩng cao đầu lên ngay!',
      badge: '1.5 - 2.5s',
      color: 'bg-red-950/70 border-red-700/80 text-red-300 hover:bg-red-900/80'
    },
    {
      name: '2. Nhắm mắt',
      file: 'alert_nham_mat.mp3',
      text: 'Cảnh báo! Bạn đang nhắm mắt, hãy mở mắt ra ngay!',
      badge: '1.5 - 2.5s',
      color: 'bg-red-950/70 border-red-700/80 text-red-300 hover:bg-red-900/80'
    },
    {
      name: '3. Nghiêng đầu',
      file: 'alert_nghieng_dau.mp3',
      text: 'Cảnh báo! Bạn đang nghiêng đầu nhắm mắt, hãy tỉnh táo lại!',
      badge: '1.5 - 2.5s',
      color: 'bg-amber-950/70 border-amber-700/80 text-amber-300 hover:bg-amber-900/80'
    },
    {
      name: '4. Rời mắt đường',
      file: 'alert_roi_mat.mp3',
      text: 'Cảnh báo! Rời mắt khỏi đường, hãy nhìn thẳng phía trước!',
      badge: '1.5 - 2.0s',
      color: 'bg-amber-950/70 border-amber-700/80 text-amber-300 hover:bg-amber-900/80'
    },
    {
      name: '5. Nguy hiểm cực độ',
      file: 'alert_nguy_hiem.mp3',
      text: '(Còi hú) + Nguy hiểm cực độ! Dừng xe nghỉ ngơi ngay!',
      badge: '2.5 - 3.5s',
      color: 'bg-rose-950/80 border-rose-600 text-rose-200 hover:bg-rose-900'
    },
    {
      name: '6. Mệt mỏi (Cấp 1)',
      file: 'alert_met_moi.mp3',
      text: 'Phát hiện dấu hiệu mệt mỏi, hãy chú ý quan sát!',
      badge: '1.5 - 2.0s',
      color: 'bg-cyan-950/70 border-cyan-700/80 text-cyan-300 hover:bg-cyan-900/80'
    },
    {
      name: '7. Bíp đổi độ nhạy',
      file: 'beep_level.mp3',
      text: 'Tiếng bíp chuyển mức độ nhạy (1 - 5)',
      badge: '0.2 - 0.3s',
      color: 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
    }
  ];
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

        {/* Vietnamese Audio Alerts Test Section */}
        {onTestSound && (
          <div className="p-3 rounded-xl bg-slate-950/90 border border-cyan-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-cyan-300 text-xs font-bold">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Thử âm thanh cảnh báo Tiếng Việt:</span>
              </div>
              {isPlayingEmergency && onStopSound && (
                <button
                  type="button"
                  onClick={onStopSound}
                  className="px-2 py-0.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold flex items-center gap-1 animate-pulse"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>DỪNG CÒI</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {soundTests.map((s) => (
                <button
                  key={s.file}
                  type="button"
                  onClick={() => onTestSound(s.file, s.loop)}
                  className={`p-2 rounded-lg border text-left text-xs font-medium transition flex items-center justify-between gap-1.5 ${s.color}`}
                  title={s.text}
                >
                  <div className="truncate">
                    <span className="font-bold block truncate">{s.name}</span>
                    <span className="text-[10px] opacity-80 truncate block">{s.text}</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/10 shrink-0">
                    {s.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

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
