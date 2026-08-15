/**
 * Session Manager - Tracks session duration, alert occurrences, history points for charts
 */

import { DrowsinessState, SessionStats } from '../types';

export class SessionManager {
  private startTimeMs: number;
  private longEyeClosureCount: number = 0;
  private yawnCount: number = 0;
  private headDropCount: number = 0;
  private distractionCount: number = 0;
  private alertLevel1Count: number = 0;
  private alertLevel2Count: number = 0;
  private alertLevel3Count: number = 0;
  private dangerSeconds: number = 0;
  private lastDangerTimestampMs: number = 0;
  private scoreSamples: number[] = [];
  private scoreHistory: { timestamp: number; score: number; state: DrowsinessState }[] = [];

  constructor() {
    this.startTimeMs = Date.now();
  }

  public recordFrame(score: number, state: DrowsinessState, nowMs: number): void {
    this.scoreSamples.push(score);

    // Track danger duration in seconds
    if (state === DrowsinessState.DANGER) {
      if (this.lastDangerTimestampMs > 0) {
        const diffSec = (nowMs - this.lastDangerTimestampMs) / 1000;
        if (diffSec < 2) {
          this.dangerSeconds += diffSec;
        }
      }
      this.lastDangerTimestampMs = nowMs;
    } else {
      this.lastDangerTimestampMs = 0;
    }

    // Record chart history point every 2 seconds
    const lastHistory = this.scoreHistory[this.scoreHistory.length - 1];
    if (!lastHistory || nowMs - lastHistory.timestamp >= 2000) {
      this.scoreHistory.push({
        timestamp: nowMs,
        score: Math.round(score),
        state
      });

      // Keep max 60 history data points (~2 minutes)
      if (this.scoreHistory.length > 60) {
        this.scoreHistory.shift();
      }
    }
  }

  public recordLongClosure(): void {
    this.longEyeClosureCount++;
  }

  public recordYawn(): void {
    this.yawnCount++;
  }

  public recordHeadDrop(): void {
    this.headDropCount++;
  }

  public recordDistraction(): void {
    this.distractionCount++;
  }

  public recordAlertLevel(level: 1 | 2 | 3): void {
    if (level === 1) this.alertLevel1Count++;
    if (level === 2) this.alertLevel2Count++;
    if (level === 3) this.alertLevel3Count++;
  }

  public getStats(): SessionStats {
    const now = Date.now();
    const driveDurationSeconds = Math.max(0, Math.floor((now - this.startTimeMs) / 1000));
    
    const avgScore = this.scoreSamples.length > 0
      ? Math.round(this.scoreSamples.reduce((a, b) => a + b, 0) / this.scoreSamples.length)
      : 0;

    return {
      startTime: this.startTimeMs,
      driveDurationSeconds,
      longEyeClosureCount: this.longEyeClosureCount,
      yawnCount: this.yawnCount,
      headDropCount: this.headDropCount,
      distractionCount: this.distractionCount,
      alertLevel1Count: this.alertLevel1Count,
      alertLevel2Count: this.alertLevel2Count,
      alertLevel3Count: this.alertLevel3Count,
      totalDangerDurationSeconds: Math.round(this.dangerSeconds),
      averageScore: avgScore,
      scoreHistory: [...this.scoreHistory]
    };
  }

  public reset(): void {
    this.startTimeMs = Date.now();
    this.longEyeClosureCount = 0;
    this.yawnCount = 0;
    this.headDropCount = 0;
    this.distractionCount = 0;
    this.alertLevel1Count = 0;
    this.alertLevel2Count = 0;
    this.alertLevel3Count = 0;
    this.dangerSeconds = 0;
    this.lastDangerTimestampMs = 0;
    this.scoreSamples = [];
    this.scoreHistory = [];
  }
}
