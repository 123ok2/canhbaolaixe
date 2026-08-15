/**
 * Eye Analysis Engine - Calculates Eye Aspect Ratio (EAR) & Accurate Eye Closure/Blink Tracking
 */

import { CONFIG } from '../config/constants';
import { CalibrationData, EyeMetrics } from '../types';

interface Point3D {
  x: number;
  y: number;
  z?: number;
}

// Calculate 2D Euclidean distance between 2 points in normalized screen space
export function euclideanDistance2D(p1: Point3D, p2: Point3D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}

// Calculate Eye Aspect Ratio (EAR)
// EAR = (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)
export function calculateEAR(landmarks: Point3D[], eyeIndices: typeof CONFIG.FACEMESH_LEFT_EYE): number {
  if (!landmarks || landmarks.length < 400) return 0.3;

  const v1 = euclideanDistance2D(landmarks[eyeIndices[0].p1], landmarks[eyeIndices[0].p2]);
  const v2 = euclideanDistance2D(landmarks[eyeIndices[1].p1], landmarks[eyeIndices[1].p2]);
  const h  = euclideanDistance2D(landmarks[eyeIndices[2].p1], landmarks[eyeIndices[2].p2]);

  if (h === 0) return 0.3;
  return (v1 + v2) / (2.0 * h);
}

export class EyeAnalyzer {
  private lastClosureTimeMs: number = 0;
  private currentClosureDurationMs: number = 0;
  private totalBlinks: number = 0;
  private wasClosed: boolean = false;
  private longClosureEvents: number = 0;
  private closureRecordedForThisEpisode: boolean = false;

  // Smoothing / Debounce for brief frame dropout
  private eyeOpenSinceMs: number = 0;

  public analyze(
    landmarks: Point3D[] | null,
    nowMs: number,
    calibration: CalibrationData
  ): { metrics: EyeMetrics; isLongClosureEvent: boolean } {
    if (!landmarks) {
      return {
        metrics: {
          leftEar: 0.3,
          rightEar: 0.3,
          averageEar: 0.3,
          isClosed: false,
          closureDurationMs: 0,
          blinkCount: this.totalBlinks
        },
        isLongClosureEvent: false
      };
    }

    const leftEar = calculateEAR(landmarks, CONFIG.FACEMESH_LEFT_EYE);
    const rightEar = calculateEAR(landmarks, CONFIG.FACEMESH_RIGHT_EYE);
    const averageEar = (leftEar + rightEar) / 2.0;

    // Use calibrated threshold or standard tuned threshold
    const threshold = calibration.isCalibrated
      ? calibration.closedEarThreshold
      : CONFIG.DEFAULT_EAR_CLOSED_THRESHOLD;

    // Raw closure check: EAR below threshold, or both eyes significantly drooping
    const isCurrentlyClosed = averageEar < threshold || (leftEar < threshold * 1.08 && rightEar < threshold * 1.08);

    let isLongClosureEvent = false;

    if (isCurrentlyClosed) {
      this.eyeOpenSinceMs = 0;
      if (!this.wasClosed) {
        this.lastClosureTimeMs = nowMs;
        this.wasClosed = true;
        this.closureRecordedForThisEpisode = false;
      }
      this.currentClosureDurationMs = nowMs - this.lastClosureTimeMs;

      // Check if closure duration qualifies as a drowsy long eye closure (>= 480ms)
      if (this.currentClosureDurationMs >= CONFIG.MIN_EYE_CLOSE_ALERT_MS) {
        if (!this.closureRecordedForThisEpisode) {
          this.longClosureEvents++;
          this.closureRecordedForThisEpisode = true;
          isLongClosureEvent = true;
        }
      }
    } else {
      // Small 120ms debounce before finalizing eye open to avoid flicker splitting blinks
      if (this.wasClosed) {
        if (this.eyeOpenSinceMs === 0) {
          this.eyeOpenSinceMs = nowMs;
        }

        if (nowMs - this.eyeOpenSinceMs >= 120) {
          const totalDuration = this.eyeOpenSinceMs - this.lastClosureTimeMs;
          // Normal blink (80ms to 450ms)
          if (totalDuration >= 80 && totalDuration < CONFIG.MIN_EYE_CLOSE_ALERT_MS) {
            this.totalBlinks++;
          }
          this.wasClosed = false;
          this.currentClosureDurationMs = 0;
          this.closureRecordedForThisEpisode = false;
          this.eyeOpenSinceMs = 0;
        }
      } else {
        this.currentClosureDurationMs = 0;
        this.eyeOpenSinceMs = 0;
      }
    }

    return {
      metrics: {
        leftEar,
        rightEar,
        averageEar,
        isClosed: isCurrentlyClosed,
        closureDurationMs: this.currentClosureDurationMs,
        blinkCount: this.totalBlinks
      },
      isLongClosureEvent
    };
  }

  public getLongClosureCount(): number {
    return this.longClosureEvents;
  }

  public getTotalBlinks(): number {
    return this.totalBlinks;
  }

  public reset(): void {
    this.lastClosureTimeMs = 0;
    this.currentClosureDurationMs = 0;
    this.totalBlinks = 0;
    this.wasClosed = false;
    this.longClosureEvents = 0;
    this.closureRecordedForThisEpisode = false;
    this.eyeOpenSinceMs = 0;
  }
}
