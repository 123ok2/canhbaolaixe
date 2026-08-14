/**
 * Eye Analysis Engine - Calculates Eye Aspect Ratio (EAR) & Eye Closure Tracking
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

    const threshold = calibration.isCalibrated
      ? calibration.closedEarThreshold
      : CONFIG.DEFAULT_EAR_CLOSED_THRESHOLD;

    const isClosed = averageEar < threshold;
    let isLongClosureEvent = false;

    if (isClosed) {
      if (!this.wasClosed) {
        this.lastClosureTimeMs = nowMs;
        this.wasClosed = true;
      }
      this.currentClosureDurationMs = nowMs - this.lastClosureTimeMs;

      // Check if this closure just crossed the long closure threshold
      if (
        this.currentClosureDurationMs >= CONFIG.MIN_EYE_CLOSE_ALERT_MS &&
        this.currentClosureDurationMs - 100 < CONFIG.MIN_EYE_CLOSE_ALERT_MS
      ) {
        this.longClosureEvents++;
        isLongClosureEvent = true;
      }
    } else {
      if (this.wasClosed) {
        // Blink completed
        const duration = nowMs - this.lastClosureTimeMs;
        if (duration > 80 && duration < 500) {
          this.totalBlinks++;
        }
        this.wasClosed = false;
      }
      this.currentClosureDurationMs = 0;
    }

    return {
      metrics: {
        leftEar,
        rightEar,
        averageEar,
        isClosed,
        closureDurationMs: this.currentClosureDurationMs,
        blinkCount: this.totalBlinks
      },
      isLongClosureEvent
    };
  }

  public getLongClosureCount(): number {
    return this.longClosureEvents;
  }

  public reset(): void {
    this.lastClosureTimeMs = 0;
    this.currentClosureDurationMs = 0;
    this.totalBlinks = 0;
    this.wasClosed = false;
    this.longClosureEvents = 0;
  }
}
