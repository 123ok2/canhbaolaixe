/**
 * Drowsiness Alert Overlay Modal (Level 1, 2, 3) with "TÔI ĐÃ TỈNH" Button
 */

import { AlertOctagon, AlertTriangle, CheckCircle2, Eye, Volume2 } from 'lucide-react';
import React from 'react';
import { DrowsinessState } from '../types';

interface AlertModalProps {
  state: DrowsinessState;
  score: number;
  onConfirmAwake: () => void;
  isMuted: boolean;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  state,
  score,
  onConfirmAwake,
  isMuted
}) => {
  // Only show modal for TIRED, WARNING, DANGER
  if (state === DrowsinessState.ALERT) return null;

  const getAlertContent = () => {
    switch (state) {
      case DrowsinessState.TIRED:
        return {
          title: 'DẤU HIỆU MỆT MỎI',
          subtitle: 'Phát hiện tần suất nhắm mắt hoặc ngáp tăng cao.',
          message: 'Vui lòng tập trung quan sát đường hoặc chuẩn bị vị trí dừng chân.',
          levelText: 'CẢNH BÁO CẤP 1',
          bgGradient: 'from-amber-950/95 via-slate-900 to-amber-950/90',
          borderColor: 'border-amber-600/80',
          textColor: 'text-amber-400',
          btnBg: 'bg-amber-600 hover:bg-amber-500 text-slate-950',
          icon: <AlertTriangle className="w-12 h-12 text-amber-400 animate-bounce" />
        };
      case DrowsinessState.WARNING:
        return {
          title: 'CẢNH BÁO: BẠN CÓ DẤU HIỆU BUỒN NGỦ!',
          subtitle: 'Mắt nhắm kéo dài hoặc gục đầu nguy hiểm.',
          message: 'Hãy giữ khoảng cách an toàn với xe phía trước và chuẩn bị nghỉ ngơi.',
          levelText: 'CẢNH BÁO CẤP 2',
          bgGradient: 'from-orange-950/95 via-slate-900 to-orange-950/90',
          borderColor: 'border-orange-500',
          textColor: 'text-orange-400',
          btnBg: 'bg-orange-500 hover:bg-orange-400 text-slate-950',
          icon: <AlertOctagon className="w-14 h-14 text-orange-400 animate-pulse" />
        };
      case DrowsinessState.DANGER:
        return {
          title: 'NGUY HIỂM CỰC KỲ CAO!',
          subtitle: 'HÃY GIẢM TỐC ĐỘ VÀ DỪNG XE NGHỈ NGƠI NGAY LẬP TỨC.',
          message: 'Hệ thống nhận thấy tài xế có thể đã ngủ gật hoặc mất kiểm soát tay lái.',
          levelText: 'CẢNH BÁO CẤP 3 - NGUY HIỂM',
          bgGradient: 'from-red-950/98 via-slate-950 to-red-950/98',
          borderColor: 'border-red-600',
          textColor: 'text-red-400',
          btnBg: 'bg-red-600 hover:bg-red-500 text-white animate-pulse',
          icon: <AlertOctagon className="w-16 h-16 text-red-500 animate-bounce" />
        };
      default:
        return null;
    }
  };

  const alert = getAlertContent();
  if (!alert) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className={`max-w-lg w-full bg-gradient-to-b ${alert.bgGradient} border-2 ${alert.borderColor} rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 relative overflow-hidden animate-in fade-in zoom-in duration-300`}
      >
        {/* Background Pulsing Glow Effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Level Tag Header */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold font-mono tracking-widest bg-slate-950/80 border border-slate-700 text-slate-300">
          <span>{alert.levelText}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
          <span>SCORE: {score}/100</span>
        </div>

        {/* Icon & Title */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-3 rounded-full bg-slate-950/80 border border-slate-800 shadow-xl">
            {alert.icon}
          </div>
          <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${alert.textColor} uppercase`}>
            {alert.title}
          </h2>
          <p className="text-sm font-semibold text-slate-200">
            {alert.subtitle}
          </p>
          <p className="text-xs text-slate-400 max-w-sm">
            {alert.message}
          </p>
        </div>

        {isMuted && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-red-400 bg-red-950/60 p-2 rounded-xl border border-red-900/60">
            <Volume2 className="w-4 h-4 text-red-400" />
            <span>Âm thanh cảnh báo hiện đang bị TẮT! Hãy bật âm thanh trong thanh điều khiển.</span>
          </div>
        )}

        {/* "TÔI ĐÃ TỈNH" Action Button */}
        <div className="pt-2 space-y-2">
          <button
            onClick={onConfirmAwake}
            id="btn-confirm-awake"
            className={`w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg tracking-wide shadow-2xl flex items-center justify-center gap-2 transition-all transform active:scale-95 ${alert.btnBg}`}
          >
            <CheckCircle2 className="w-6 h-6" />
            <span>TÔI ĐÃ TỈNH</span>
          </button>

          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cảnh báo sẽ tự biến mất khi bạn mở mắt & nhìn thẳng (~0.4s), hoặc bấm "TÔI ĐÃ TỈNH".</span>
          </p>
        </div>
      </div>
    </div>
  );
};
