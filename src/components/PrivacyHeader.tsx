/**
 * Privacy & Safety Disclaimer Banner - Mobile & Desktop Optimized
 */

import { AlertCircle, ShieldCheck } from 'lucide-react';
import React from 'react';

export const PrivacyHeader: React.FC = () => {
  return (
    <div className="bg-slate-900/90 border-b border-slate-800/80 px-3 sm:px-6 py-1.5 text-[11px] sm:text-xs text-slate-300">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {/* Local Processing Guarantee */}
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
          <span>Xử lý 100% cục bộ trên máy — Không gửi video lên mạng</span>
        </div>

        {/* Driver Responsibility Reminder */}
        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] sm:text-[11px]">
          <AlertCircle className="w-3 h-3 shrink-0 text-amber-400" />
          <span>Hệ thống hỗ trợ cảnh báo — Tài xế luôn chủ động quan sát</span>
        </div>
      </div>
    </div>
  );
};
