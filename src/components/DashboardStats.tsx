/**
 * Real-time Dashboard Statistics & Score Trend Chart Component
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
      return { label: 'XUẤT SẮC', color: 'text-emerald-400 bg-emerald-950/80 border-emerald-800' };
    } else if (stats.averageScore <= 50) {
      return { label: 'AN TOÀN', color: 'text-cyan-400 bg-cyan-950/80 border-cyan-800' };
    } else if (stats.averageScore <= 70) {
      return { label: 'CẦN CHÚ Ý', color: 'text-amber-400 bg-amber-950/80 border-amber-800' };
    } else {
      return { label: 'NGUY HIỂM', color: 'text-red-400 bg-red-950/80 border-red-800' };
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
    <div className="space-y-4">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Driving Duration */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Thời gian lái</span>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {formatTime(stats.driveDurationSeconds)}
          </div>
        </div>

        {/* Long Eye Closures */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Nhắm mắt lâu</span>
          </div>
          <div className="text-xl font-bold font-mono text-indigo-300 mt-1">
            {stats.longEyeClosureCount} <span className="text-xs text-slate-500 font-normal">lần</span>
          </div>
        </div>

        {/* Yawns */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <Smile className="w-3.5 h-3.5 text-amber-400" />
            <span>Số lần ngáp</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-1">
            {stats.yawnCount} <span className="text-xs text-slate-500 font-normal">lần</span>
          </div>
        </div>

        {/* Head Drops */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <Moon className="w-3.5 h-3.5 text-purple-400" />
            <span>Số lần gục đầu</span>
          </div>
          <div className="text-xl font-bold font-mono text-purple-300 mt-1">
            {stats.headDropCount} <span className="text-xs text-slate-500 font-normal">lần</span>
          </div>
        </div>

        {/* Danger Duration */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span>Thời gian nguy hiểm</span>
          </div>
          <div className="text-xl font-bold font-mono text-red-400 mt-1">
            {stats.totalDangerDurationSeconds} <span className="text-xs text-slate-500 font-normal">giây</span>
          </div>
        </div>

        {/* Safety Level */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mức độ an toàn</span>
          </div>
          <div className="mt-1">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${safetyRating.color}`}>
              {safetyRating.label}
            </span>
          </div>
        </div>
      </div>

      {/* Realtime Chart Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Xu hướng Drowsiness Score (Realtime)
            </h3>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Tổng số cảnh báo: <span className="text-amber-400 font-bold">{totalAlerts}</span>
          </div>
        </div>

        <div className="h-44 w-full pt-1">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#f8fafc'
                  }}
                  itemStyle={{ color: '#38bdf8' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#scoreGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
              Đang thu thập dữ liệu hành trình theo thời gian thực...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
