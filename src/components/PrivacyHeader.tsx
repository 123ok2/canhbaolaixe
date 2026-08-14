/**
 * Privacy & Safety Disclaimer Banner
 */

import { AlertCircle, Lock } from 'lucide-react';
import React from 'react';

export const PrivacyHeader: React.FC = () => {
  return (
    <div className="bg-slate-900/80 border-b border-slate-800/60 px-4 py-2 text-xs text-slate-300">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-400 font-medium">
          <Lock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Video camera được xử lý cục bộ 100% trên thiết bị và KHÔNG bao giờ được lưu trữ hay tải lên server.</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
          <span>DriveGuard AI là hệ thống hỗ trợ cảnh báo. Tài xế phải luôn tập trung và chịu trách nhiệm khi điều khiển phương tiện.</span>
        </div>
      </div>
    </div>
  );
};
