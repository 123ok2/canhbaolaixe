/**
 * Drowsiness Alert Overlay Modal (Level 1, 2, 3) with Instant Close (X Button),
 * "TÔI ĐÃ TỈNH" Button, and Intelligent Driver-Friendly Controls
 * Fully Optimized for Mobile & Desktop
 */

import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  NavigationOff,
  Volume2,
  X
} from 'lucide-react';
import React, { useEffect } from 'react';
import { DrowsinessState, PrimaryAlertReason } from '../types';

interface AlertModalProps {
  state: DrowsinessState;
  score: number;
  isCalibrated?: boolean;
  primaryAlertReason?: PrimaryAlertReason;
  wideEyesDurationMs?: number;
  isWideEyesActive?: boolean;
  onConfirmAwake: () => void;
  onDismissInstant?: () => void;
  isMuted: boolean;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  state,
  score,
  isCalibrated = true,
  primaryAlertReason,
  wideEyesDurationMs = 0,
  isWideEyesActive = false,
  onConfirmAwake,
  onDismissInstant,
  isMuted
}) => {
  // Support Escape & Space keys for instant hands-free / keyboard dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        if (onDismissInstant) onDismissInstant();
        else onConfirmAwake();
      }
    };

    if (isCalibrated && state !== DrowsinessState.ALERT) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [state, isCalibrated, onConfirmAwake, onDismissInstant]);

  // Only show modal when calibrated and in TIRED, WARNING, DANGER state
  if (!isCalibrated || state === DrowsinessState.ALERT) return null;

  const handleClose = () => {
    if (onDismissInstant) {
      onDismissInstant();
    } else {
      onConfirmAwake();
    }
  };

  const getAlertContent = () => {
    // Check specific primary reason first
    if (primaryAlertReason === 'HEAD_DROP') {
      return {
        title: 'CẢNH BÁO: PHÁT HIỆN GỤC ĐẦU!',
        subtitle: 'Bạn đang cúi gục đầu về phía trước.',
        message: 'Hãy ngẩng cao đầu, ngồi thẳng lưng và nhìn về phía trước đường!',
        levelText: state === DrowsinessState.DANGER ? 'CẤP 3 - NGUY HIỂM CỰC ĐỘ' : 'CẤP 2 - NGUY CƠ GỤC ĐẦU',
        bgGradient: 'from-red-950/98 via-slate-950 to-orange-950/95',
        borderColor: 'border-red-500',
        textColor: 'text-red-400',
        btnBg: 'bg-red-600 hover:bg-red-500 text-white',
        icon: <NavigationOff className="w-10 h-10 sm:w-14 sm:h-14 text-red-400 animate-bounce" />
      };
    }

    if (primaryAlertReason === 'HEAD_TILT_SLEEP') {
      return {
        title: 'CẢNH BÁO: NGHIÊNG ĐẦU NGỦ GẬT!',
        subtitle: 'Phát hiện tư thế ngả đầu sang bên ĐỒNG THỜI nhắm mắt.',
        message: 'Hãy mở to mắt, giữ thẳng cổ và tập trung nhìn đường!',
        levelText: state === DrowsinessState.DANGER ? 'CẤP 3 - NGUY HIỂM CỰC ĐỘ' : 'CẤP 2 - NGHIÊNG ĐẦU NHẮM MẮT',
        bgGradient: 'from-red-950/98 via-slate-950 to-orange-950/95',
        borderColor: 'border-red-500',
        textColor: 'text-red-400',
        btnBg: 'bg-red-600 hover:bg-red-500 text-white',
        icon: <NavigationOff className="w-10 h-10 sm:w-14 sm:h-14 text-red-400 animate-pulse" />
      };
    }

    if (primaryAlertReason === 'FACE_LOST') {
      return {
        title: 'CẢNH BÁO: RỜI MẶT KHỎI CAMERA!',
        subtitle: 'Không phát hiện khuôn mặt trong tầm quan sát.',
        message: 'Hãy hướng mặt nhìn thẳng về phía trước đường và giữ điện thoại đối diện tầm mắt!',
        levelText: 'CẢNH BÁO - MẤT TẬP TRUNG',
        bgGradient: 'from-orange-950/98 via-slate-950 to-amber-950/95',
        borderColor: 'border-orange-500',
        textColor: 'text-orange-400',
        btnBg: 'bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold',
        icon: <AlertTriangle className="w-10 h-10 sm:w-14 sm:h-14 text-orange-400 animate-pulse" />
      };
    }

    if (primaryAlertReason === 'EARLY_DISTRACTION') {
      return {
        title: 'CẢNH BÁO: PHÁT HIỆN MẤT TẬP TRUNG!',
        subtitle: 'Bạn đang không nhìn thẳng vào làn đường phía trước.',
        message: 'Hãy tập trung quan sát đường đi và giữ tầm nhìn hướng về phía trước!',
        levelText: 'CẢNH BÁO SỚM - MẤT TẬP TRUNG',
        bgGradient: 'from-amber-950/98 via-slate-950 to-orange-950/95',
        borderColor: 'border-amber-500',
        textColor: 'text-amber-400',
        btnBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold',
        icon: <AlertTriangle className="w-10 h-10 sm:w-14 sm:h-14 text-amber-400 animate-pulse" />
      };
    }

    if (primaryAlertReason === 'EARLY_DROWSINESS' || primaryAlertReason === 'DROWSY_DROOP') {
      return {
        title: 'CẢNH BÁO: CHỚM BUỒN NGỦ / MỆT MỎI!',
        subtitle: 'Độ mở của mắt đang giảm dần hoặc xuất hiện ngáp liên tục.',
        message: 'Hãy mở to mắt, uống nước hoặc bật điều hòa để giữ tinh thần tỉnh táo!',
        levelText: 'CẢNH BÁO SỚM - BUỒN NGỦ',
        bgGradient: 'from-amber-950/98 via-slate-950 to-amber-900/90',
        borderColor: 'border-amber-500',
        textColor: 'text-amber-300',
        btnBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold',
        icon: <AlertTriangle className="w-10 h-10 sm:w-14 sm:h-14 text-amber-400 animate-bounce" />
      };
    }

    if (primaryAlertReason === 'HEAD_TURNED') {
      return {
        title: 'CẢNH BÁO: NGOẢNH MẶT RỜI ĐƯỜNG!',
        subtitle: 'Bạn đang quay đầu nhìn sang hướng khác quá lâu.',
        message: 'Tập trung tầm nhìn 100% vào làn đường phía trước để phòng ngừa va chạm!',
        levelText: 'CẤP 2 - MẤT TẬP TRUNG',
        bgGradient: 'from-orange-950/95 via-slate-900 to-orange-950/90',
        borderColor: 'border-orange-500',
        textColor: 'text-orange-400',
        btnBg: 'bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold',
        icon: <AlertTriangle className="w-10 h-10 sm:w-14 sm:h-14 text-orange-400 animate-bounce" />
      };
    }

    if (primaryAlertReason === 'EYES_CLOSED') {
      return {
        title: 'CẢNH BÁO: PHÁT HIỆN NHẮM MẮT!',
        subtitle: 'Mắt của bạn đang nhắm kéo dài (nguy cơ ngủ gật).',
        message: 'Hãy mở to mắt, giữ khoảng cách an toàn với xe phía trước!',
        levelText: state === DrowsinessState.DANGER ? 'CẤP 3 - NGUY HIỂM CỰC ĐỘ' : 'CẤP 2 - NHẮM MẮT LÂU',
        bgGradient: 'from-red-950/98 via-slate-950 to-red-950/98',
        borderColor: 'border-red-600',
        textColor: 'text-red-400',
        btnBg: 'bg-red-600 hover:bg-red-500 text-white animate-pulse',
        icon: <EyeOff className="w-10 h-10 sm:w-14 sm:h-14 text-red-500 animate-pulse" />
      };
    }

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
          btnBg: 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold',
          icon: <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400 animate-bounce" />
        };
      case DrowsinessState.WARNING:
        return {
          title: 'CẢNH BÁO: BUỒN NGỦ NGUY HIỂM!',
          subtitle: 'Mắt nhắm kéo dài hoặc gục đầu bất thường.',
          message: 'Hãy giữ khoảng cách an toàn với xe phía trước và chuẩn bị nghỉ ngơi.',
          levelText: 'CẢNH BÁO CẤP 2',
          bgGradient: 'from-orange-950/95 via-slate-900 to-orange-950/90',
          borderColor: 'border-orange-500',
          textColor: 'text-orange-400',
          btnBg: 'bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold',
          icon: <AlertOctagon className="w-10 h-10 sm:w-14 sm:h-14 text-orange-400 animate-pulse" />
        };
      case DrowsinessState.DANGER:
        return {
          title: 'NGUY HIỂM CỰC KỲ CAO!',
          subtitle: 'HÃY GIẢM TỐC ĐỘ VÀ DỪNG XE NGHỈ NGƠI NGAY!',
          message: 'Hệ thống nhận thấy tài xế có thể đã ngủ gật hoặc mất kiểm soát tay lái.',
          levelText: 'CẤP 3 - NGUY HIỂM',
          bgGradient: 'from-red-950/98 via-slate-950 to-red-950/98',
          borderColor: 'border-red-600',
          textColor: 'text-red-400',
          btnBg: 'bg-red-600 hover:bg-red-500 text-white animate-pulse',
          icon: <AlertOctagon className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 animate-bounce" />
        };
      default:
        return null;
    }
  };

  const alert = getAlertContent();
  if (!alert) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`max-w-md w-full max-h-[92vh] overflow-y-auto bg-gradient-to-b ${alert.bgGradient} border-2 ${alert.borderColor} rounded-3xl p-4 sm:p-6 shadow-2xl text-center space-y-4 relative overflow-hidden animate-in zoom-in-95 duration-150`}
      >
        {/* Top Floating Action Bar: Level Tag + Instant Dismiss 'X' Button */}
        <div className="flex items-center justify-between gap-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold font-mono tracking-wider bg-slate-950/85 border border-slate-700 text-slate-300">
            <span>{alert.levelText}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            <span>SCORE: {score}/100</span>
          </div>

          {/* Dedicated Quick 'X' Close Button */}
          <button
            onClick={handleClose}
            id="btn-close-alert-modal"
            aria-label="Đóng cảnh báo ngay lập tức"
            title="Đóng cảnh báo (Esc)"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-lg active:scale-90 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Icon & Title */}
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-2.5 rounded-full bg-slate-950/80 border border-slate-800 shadow-xl">
            {alert.icon}
          </div>
          <h2 className={`text-lg sm:text-xl font-black tracking-tight ${alert.textColor} uppercase leading-tight`}>
            {alert.title}
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-200">
            {alert.subtitle}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs leading-relaxed">
            {alert.message}
          </p>
        </div>

        {/* Auto Dismiss by Opening Wide Eyes (1 second) */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-2.5 sm:p-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Eye className={`w-3.5 h-3.5 ${isWideEyesActive ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              <span>Mở to mắt 1s để tự tắt</span>
            </span>
            <span className={`font-mono font-bold ${isWideEyesActive ? 'text-emerald-400' : 'text-slate-500'}`}>
              {Math.min(100, Math.round((wideEyesDurationMs / 1000) * 100))}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-75 rounded-full ${
                isWideEyesActive
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                  : 'bg-slate-700'
              }`}
              style={{ width: `${Math.min(100, (wideEyesDurationMs / 1000) * 100)}%` }}
            />
          </div>
        </div>

        {isMuted && (
          <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] text-red-300 bg-red-950/70 p-2 rounded-xl border border-red-800/70">
            <Volume2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>Âm thanh cảnh báo đang tắt.</span>
          </div>
        )}

        {/* Primary Action Button: "TÔI ĐÃ TỈNH" */}
        <div className="pt-1 space-y-1.5">
          <button
            onClick={onConfirmAwake}
            id="btn-confirm-awake"
            className={`w-full py-3 sm:py-3.5 px-4 rounded-2xl font-black text-sm sm:text-base tracking-wide shadow-2xl flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer ${alert.btnBg}`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>TÔI ĐÃ TỈNH (XÁC NHẬN)</span>
          </button>

          <div className="text-[10px] text-slate-400">
            Bấm nút <b>✕</b> ở trên hoặc chạm ngoài để tắt ngay.
          </div>
        </div>
      </div>
    </div>
  );
};
