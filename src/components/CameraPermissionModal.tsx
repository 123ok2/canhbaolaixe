/**
 * Camera Permission Request & Error Modal
 */

import { Activity, Camera, RefreshCw, ShieldAlert } from 'lucide-react';
import React from 'react';

interface CameraPermissionModalProps {
  error: string | null;
  onGrantPermission: () => void;
  isLoading: boolean;
}

export const CameraPermissionModal: React.FC<CameraPermissionModalProps> = ({
  error,
  onGrantPermission,
  isLoading
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/50">
          {error ? (
            <ShieldAlert className="w-8 h-8 text-amber-400" />
          ) : (
            <Camera className="w-8 h-8 text-cyan-400 animate-pulse" />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {error ? 'Cần quyền truy cập Camera' : 'Cấp quyền Camera cho DriveGuard AI'}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {error ? (
              <span className="text-amber-300 font-medium">{error}</span>
            ) : (
              'DriveGuard AI cần quyền truy cập camera trước để quan sát khuôn mặt và phân tích trạng thái tỉnh táo của tài xế theo thời gian thực.'
            )}
          </p>
        </div>

        {error && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 text-left space-y-2">
            <p className="font-semibold text-slate-200">Hướng dẫn cho phép camera:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Nhấn vào biểu tượng 🔒 hoặc 🎥 trên thanh địa chỉ trình duyệt.</li>
              <li>Chọn <span className="text-cyan-300 font-medium">Quyền / Camera</span> và đổi thành <span className="text-emerald-400 font-medium">Cho phép (Allow)</span>.</li>
              <li>Nhấn nút <span className="text-cyan-300 font-medium">Thử lại camera</span> bên dưới.</li>
            </ol>
          </div>
        )}

        <div className="pt-2 space-y-2">
          <button
            onClick={onGrantPermission}
            disabled={isLoading}
            id="btn-grant-camera"
            className="w-full py-3 px-6 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white hover:from-cyan-400 hover:to-indigo-500 transition-all shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang kết nối camera...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>{error ? 'Thử lại camera' : 'Bật camera'}</span>
              </>
            )}
          </button>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Bảo mật 100%: Dữ liệu hình ảnh chỉ xử lý trực tiếp trên thiết bị của bạn</span>
        </div>
      </div>
    </div>
  );
};
