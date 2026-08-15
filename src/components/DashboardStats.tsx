/**
 * Real-time Dashboard Statistics & Score Trend Chart Component
 * Fully Optimized for Mobile & Desktop
 */

import { Activity, AlertTriangle, Clock, Eye, Moon, Shield, Smile } from 'lucide-react';
import React from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SessionStats } from '../types';

interface DashboardStatsProps {
  stats: SessionStats;
  currentScore: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, currentScore }) => {
  // Format driving time in HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const totalAlerts = stats.alertLevel1Count + stats.alertLevel2Count + stats.alertLevel3Count;

  // Calculate overall safety rating
  const getSafetyRating = () => {
    if (stats.averageScore <= 25 && stats.totalDangerDurationSeconds === 0) {
      return { label: 'XUẤT SẮC', color: 'text-emerald-300 bg-emerald-950/80 border-emerald-700/80' };
    } else if (stats.averageScore <= 50) {
      return { label: 'AN TOÀN', color: 'text-cyan-300 bg-cyan-950/80 border-cyan-700/80' };
    } else if (stats.averageScore <= 70) {
      return { label: 'CẦN CHÚ Ý', color: 'text-amber-300 bg-amber-950/80 border-amber-700/80' };
    } else {
      return { label: 'NGUY HIỂM', color: 'text-red-300 bg-red-950/90 border-red-600' };
    }
  };

  const safetyRating = getSafetyRating();

  // Prepare chart data points
  const chartData = stats.scoreHistory.map((item) => {
    const date = new Date(item.timestamp);
    const timeStr = `${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    return {
      time: timeStr,
      score: item.score
    };
  });

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 6 Key Metrics Grid (2 columns on mobile, 3 on tablet, 6 on desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {/* 1. Driving Duration */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] sm:text-xs font-medium">
            <div className="w-5 h-5 rounded-md bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <span className="truncate">Thời gian lái</span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-white mt-1">
            {formatTime(stats.driveDurationSeconds)}
          </div>
        </div>

        {/* 2. Long Eye Closures */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] sm:text-xs font-medium">
            <div className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <span className="truncate">Nhắm mắt lâu</span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-indigo-300 mt-1 flex items-baseline gap-1">
            {stats.longEyeClosureCount}
            <span className="text-[10px] text-slate-500 font-normal font-sans">lần</span>
          </div>
        </div>

        {/* 3. Yawns */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] sm:text-xs font-medium">
            <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Smile className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <span className="truncate">Số lần ngáp</span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-amber-300 mt-1 flex items-baseline gap-1">
            {stats.yawnCount}
            <span className="text-[10px] text-slate-500 font-normal font-sans">lần</span>
          </div>
        </div>

        {/* 4. Head Drops */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] sm:text-xs font-medium">
            <div className="w-5 h-5 rounded-md bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <Moon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <span className="truncate">Số lần gục đầu</span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-purple-300 mt-1 flex items-baseline gap-1">
            {stats.headDropCount}
            <span className="text-[10px] text-slate-500 font-normal font-sans">lần</span>
          </div>
        </div>

        {/* 5. Danger Duration */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] sm:text-xs font-medium">
            <div className="w-5 h-5 rounded-md bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <span className="truncate">Nguy hiểm</span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-red-400 mt-1 flex items-baseline gap-1">
            {stats.totalDangerDurationSeconds}
            <span className="text-[10px] text-slate-500 font-normal font-sans">giây</span>
          </div>
        </div>

        {/* 6. Safety Level */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] sm:text-xs font-medium">
            <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <span className="truncate">Đánh giá an toàn</span>
          </div>
          <div className="mt-1">
            <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${safetyRating.color}`}>
              {safetyRating.label}
            </span>
          </div>
        </div>
      </div>

      {/* Realtime Chart Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xl space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
              Biểu đồ Buồn ngủ theo Thời gian
            </h3>
          </div>
          <div className="text-[11px] sm:text-xs text-slate-400 font-mono">
            Tổng cảnh báo: <span className="text-amber-400 font-bold">{totalAlerts}</span>
          </div>
        </div>

        <div className="h-36 sm:h-44 w-full pt-1">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#475569"
                  fontSize={10}
                  domain={[0, 100]}
                  ticks={[0, 30, 60, 80, 100]}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '11px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)'
                  }}
                  itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value: any) => [`${value} điểm`, 'Chỉ số']}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#06b6d4"
                  strokeWidth={2.2}
                  fillOpacity={1}
                  fill="url(#scoreGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
              Đang tích lũy dữ liệu hành trình theo thời gian thực...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
