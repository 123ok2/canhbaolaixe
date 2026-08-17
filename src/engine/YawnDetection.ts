/**
 * Yawn Detection Engine - Calculates Mouth Aspect Ratio (MAR) & Robust Yawn Tracking
 */

import { CONFIG } from '../config/constants';
import { CalibrationData, YawnMetrics } from '../types';
import { euclideanDistance2D } from './EyeAnalysis';
import { ExponentialMovingAverage } from './SignalFilters';

interface Point3D {
  x: number;
  y: number;
  z?: number;
}

export function calculateMAR(landmarks: Point3D[], aspectRatio: number = 1.0): number {
  if (!landmarks || landmarks.length < 400) return 0.2;

  const mouthIndices = CONFIG.FACEMESH_MOUTH;
  const verticalInner = euclideanDistance2D(landmarks[mouthIndices[0].p1], landmarks[mouthIndices[0].p2], aspectRatio);
  const verticalOuter = euclideanDistance2D(landmarks[mouthIndices[1].p1], landmarks[mouthIndices[1].p2], aspectRatio);
  const horizontal    = euclideanDistance2D(landmarks[mouthIndices[2].p1], landmarks[mouthIndices[2].p2], aspectRatio);

  if (horizontal === 0) return 0.2;
  const avgVertical = (verticalInner + verticalOuter) / 2.0;
  return avgVertical / horizontal;
}

export class YawnAnalyzer {
  private lastMouthOpenTimeMs: number = 0;
  private currentYawnDurationMs: number = 0;
  private totalYawns: number = 0;
  private isCurrentlyYawning: boolean = false;
  private yawnRecordedForThisSession: boolean = false;
  private marEma = new ExponentialMovingAverage(CONFIG.FILTER.EMA_ALPHA_MAR);

  // Grace period tracking for momentary lips vibration / frame drop during a single yawn
  private mouthClosedSinceMs: number = 0;

  public analyze(
    landmarks: Point3D[] | null,
    nowMs: number,
    calibration: CalibrationData,
    aspectRatio: number = 1.0,
    minYawnDurationMs: number = CONFIG.MIN_YAWN_DURATION_MS
  ): { metrics: YawnMetrics; isNewYawnDetected: boolean } {
    if (!landmarks) {
      return {
        metrics: {
          mar: 0.2,
          isYawning: false,
          yawnDurationMs: 0,
          yawnCount: this.totalYawns
        },
        isNewYawnDetected: false
      };
    }

    const rawMar = calculateMAR(landmarks, aspectRatio);
    const mar = this.marEma.update(rawMar);

    // Adaptive threshold: calibrated threshold or standard tuned 0.48
    const threshold = calibration.isCalibrated
      ? calibration.openMarThreshold
      : CONFIG.DEFAULT_MAR_YAWN_THRESHOLD;

    const isMouthOpen = mar >= threshold;
    let isNewYawnDetected = false;

    if (isMouthOpen) {
      this.mouthClosedSinceMs = 0;
      if (this.lastMouthOpenTimeMs === 0) {
        this.lastMouthOpenTimeMs = nowMs;
      }
      this.currentYawnDurationMs = nowMs - this.lastMouthOpenTimeMs;

      // When mouth has been open >= minYawnDurationMs (default 1.0s or sensitivity setting), count as genuine yawn
      if (this.currentYawnDurationMs >= minYawnDurationMs) {
        this.isCurrentlyYawning = true;
        if (!this.yawnRecordedForThisSession) {
          this.totalYawns++;
          this.yawnRecordedForThisSession = true;
          isNewYawnDetected = true;
        }
      }
    } else {
      // Allow a 250ms dropout grace window so minor mouth movement doesn't cancel an ongoing yawn
      if (this.lastMouthOpenTimeMs > 0) {
        if (this.mouthClosedSinceMs === 0) {
          this.mouthClosedSinceMs = nowMs;
        }

        // If mouth has remained closed for > 250ms, conclude the yawn episode cleanly
        if (nowMs - this.mouthClosedSinceMs > 250) {
          this.lastMouthOpenTimeMs = 0;
          this.currentYawnDurationMs = 0;
          this.isCurrentlyYawning = false;
          this.yawnRecordedForThisSession = false;
          this.mouthClosedSinceMs = 0;
        }
      } else {
        this.mouthClosedSinceMs = 0;
        this.currentYawnDurationMs = 0;
        this.isCurrentlyYawning = false;
      }
    }

    return {
      metrics: {
        mar,
        isYawning: this.isCurrentlyYawning,
        yawnDurationMs: this.currentYawnDurationMs,
        yawnCount: this.totalYawns
      },
      isNewYawnDetected
    };
  }

  public getTotalYawns(): number {
    return this.totalYawns;
  }

  public reset(): void {
    this.lastMouthOpenTimeMs = 0;
    this.currentYawnDurationMs = 0;
    this.totalYawns = 0;
    this.isCurrentlyYawning = false;
    this.yawnRecordedForThisSession = false;
    this.mouthClosedSinceMs = 0;
    this.marEma.reset();
  }
}
