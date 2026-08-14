/**
 * Gemini AI Analysis Report Modal
 */

import { AlertTriangle, CheckCircle, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import React from 'react';
import { GeminiAnalysisReport, SessionStats } from '../types';

interface GeminiAnalysisModalProps {
  report: GeminiAnalysisReport | null;
  isLoading: boolean;
  error: string | null;
  onRefreshReport: () => void;
  onClose: () => void;
  stats: SessionStats;
}

export const GeminiAnalysisModal: React.FC<GeminiAnalysisModalProps> = ({
  report,
  isLoading,
  error,
  onRefreshReport,
  onClose,
  stats
}) => {
  const getRiskBadge = (level?: string) => {
    switch (level) {
      case 'THẤP':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'TRUNG BÌNH':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'CAO':
        return 'bg-orange-950 text-orange-300 border-orange-800';
      case 'CỰC KỲ NGUY HIỂM':
        return 'bg-red-950 text-red-300 border-red-700 animate-pulse';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-900 to-purple-900 border border-purple-700/60 text-purple-300 shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Phân tích An toàn Hành trình Gemini AI
              </h2>
              <p className="text-xs text-slate-400">
                Tổng hợp thông số sinh trắc học và hành vi lái xe bằng mô hình Gemini 3.7 Flash
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 text-center space-y-4">
            <RefreshCw className="w-10 h-10 text-purple-400 animate-spin mx-auto" />
            <p className="text-sm text-slate-300 font-medium">
              Đang tổng hợp dữ liệu và yêu cầu Gemini AI phân tích...
            </p>
            <p className="text-xs text-slate-500">
              Đang phân tích {stats.driveDurationSeconds}s lái xe, {stats.longEyeClosureCount} lần nhắm mắt lâu, {stats.yawnCount} lần ngáp...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-300 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span>Không thể phân tích dữ liệu AI</span>
            </div>
            <p className="text-xs text-red-200 leading-relaxed">{error}</p>
            <button
              onClick={onRefreshReport}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-800 hover:bg-red-700 text-white transition-colors"
            >
              Thử phân tích lại
            </button>
          </div>
        )}

        {/* Report Content */}
        {report && !isLoading && (
          <div className="space-y-5">
            {/* Risk Badge & Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase font-mono tracking-wider font-semibold">
                  Mức nguy cơ buồn ngủ:
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskBadge(report.riskLevel)}`}>
                  {report.riskLevel}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-200 leading-relaxed pt-1">
                "{report.summary}"
              </p>
            </div>

            {/* Probable Causes */}
            {report.probableCauses && report.probableCauses.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Dấu hiệu & Nguyên nhân nhận diện được:</span>
                </h3>
                <ul className="space-y-1.5">
                  {report.probableCauses.map((cause, idx) => (
                    <li key={idx} className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0"></span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Observations */}
            {report.observations && report.observations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Nhận xét xu hướng hành trình:</span>
                </h3>
                <ul className="space-y-1.5">
                  {report.observations.map((obs, idx) => (
                    <li key={idx} className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0"></span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations && report.recommendations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Khuyến nghị an toàn giao thông:</span>
                </h3>
                <ul className="space-y-1.5">
                  {report.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-xs text-emerald-200 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-800/60 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer Action */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <button
                onClick={onRefreshReport}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Cập nhật phân tích mới</span>
              </button>

              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
