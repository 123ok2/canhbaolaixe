/**
 * Client-side Gemini AI Analysis Service
 * Calls server endpoint /api/analyze-drowsiness
 */

import { GeminiAnalysisReport, SessionStats } from '../types';

export async function requestGeminiDrowsinessReport(stats: SessionStats): Promise<GeminiAnalysisReport> {
  const payload = {
    driveDuration: stats.driveDurationSeconds,
    longEyeClosures: stats.longEyeClosureCount,
    yawns: stats.yawnCount,
    headDropEvents: stats.headDropCount,
    averageDrowsinessScore: stats.averageScore,
    alertLevel1Count: stats.alertLevel1Count,
    alertLevel2Count: stats.alertLevel2Count,
    alertLevel3Count: stats.alertLevel3Count,
    totalDangerDurationSeconds: stats.totalDangerDurationSeconds
  };

  const response = await fetch('/api/analyze-drowsiness', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi máy chủ (${response.status}) khi phân tích AI.`);
  }

  return await response.json();
}
