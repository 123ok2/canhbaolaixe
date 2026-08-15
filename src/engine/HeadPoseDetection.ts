/**
 * Head Pose Detection Engine - Estimates Pitch, Yaw, Roll and Robust Head Drop events
 */

import { CONFIG } from '../config/constants';
import { HeadPoseMetrics } from '../types';

interface Point3D {
  x: number;
  y: number;
  z?: number;
}

export class HeadPoseAnalyzer {
  private lastHeadDropTimeMs: number = 0;
  private currentHeadDropDurationMs: number = 0;
  private totalHeadDrops: number = 0;
  private isCurrentlyDropped: boolean = false;
  private dropRecordedForThisSession: boolean = false;

  // Debounce for momentary head posture flicker
  private headRecoveredSinceMs: number = 0;

  public analyze(
    landmarks: Point3D[] | null,
    nowMs: number,
    isEyeClosed: boolean = false
  ): { metrics: HeadPoseMetrics; isNewHeadDropDetected: boolean } {
    if (!landmarks || landmarks.length < 400) {
      return {
        metrics: {
          pitch: 0,
          yaw: 0,
          roll: 0,
          isHeadDropped: false,
          headDropDurationMs: 0,
          headDropCount: this.totalHeadDrops,
          poseType: 'NORMAL',
          isHeadForward: false,
          isTiltLeft: false,
          isTiltRight: false,
          isTurnedAway: false
        },
        isNewHeadDropDetected: false
      };
    }

    // Key facial points for orientation estimation
    // Nose tip: 1, Chin: 152, Forehead: 10, Left Eye: 33, Right Eye: 263
    const nose = landmarks[1];
    const chin = landmarks[152];
    const forehead = landmarks[10];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];

    // 1. Roll estimation (head side tilt)
    const dy = rightEye.y - leftEye.y;
    const dx = rightEye.x - leftEye.x;
    const rollAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

    // 2. Yaw estimation (head left/right rotation)
    const distToLeftEye = Math.hypot(nose.x - leftEye.x, nose.y - leftEye.y);
    const distToRightEye = Math.hypot(nose.x - rightEye.x, nose.y - rightEye.y);
    const yawRatio = (distToLeftEye - distToRightEye) / (distToLeftEye + distToRightEye || 0.001);
    const yawAngle = yawRatio * 55;

    // 3. Pitch estimation (head nodding down/up) using 3D face geometric proportions
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;
    const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) || 0.001;

    // Vertical segment lengths normalized by eye width
    const upperSegY = (nose.y - eyeCenterY) / eyeDistance;        // Eyes-to-nose vertical distance
    const lowerSegY = (chin.y - nose.y) / eyeDistance;            // Nose-to-chin vertical distance
    const totalHeightRatio = (chin.y - forehead.y) / eyeDistance; // Total face height / width
    const upperToLowerRatio = upperSegY / (lowerSegY || 0.001);   // Ratio of upper to lower face

    const zForehead = forehead.z || 0;
    const zChin = chin.z || 0;
    const zDiff = zForehead - zChin; // Forehead depth vs Chin depth

    // Neutral baseline: upperToLowerRatio ~0.42, lowerSegY ~0.90, totalHeightRatio ~1.80
    // When head nods down (gục đầu về phía trước):
    // upperToLowerRatio increases (>0.55), lowerSegY shrinks (<0.75), zDiff becomes negative (< -0.02)
    const pitchFromRatio = (0.42 - upperToLowerRatio) * 70;
    const pitchFromLower = (lowerSegY - 0.90) * 45;
    const pitchFromHeight = (totalHeightRatio - 1.80) * 35;
    const pitchFromZ = (zDiff < 0) ? zDiff * 140 : zDiff * 55;

    const rawPitch = pitchFromRatio * 0.40 + pitchFromLower * 0.30 + pitchFromHeight * 0.15 + pitchFromZ * 0.15;
    const pitchAngle = Math.max(-60, Math.min(60, rawPitch));

    // Check specific directional postures
    const isHeadForward = pitchAngle < CONFIG.HEAD_DROP_PITCH_THRESHOLD;
    const isTiltLeft = rollAngle < -CONFIG.HEAD_TILT_ROLL_THRESHOLD;
    const isTiltRight = rollAngle > CONFIG.HEAD_TILT_ROLL_THRESHOLD;
    const isTurnedAway = Math.abs(yawAngle) > CONFIG.HEAD_TURN_YAW_THRESHOLD;

    let poseType: 'DROP_FORWARD' | 'TILT_LEFT' | 'TILT_RIGHT' | 'TURN_LEFT' | 'TURN_RIGHT' | 'NORMAL' = 'NORMAL';
    if (isHeadForward) {
      poseType = 'DROP_FORWARD';
    } else if (isTiltLeft) {
      poseType = 'TILT_LEFT';
    } else if (isTiltRight) {
      poseType = 'TILT_RIGHT';
    } else if (isTurnedAway) {
      poseType = yawAngle < 0 ? 'TURN_LEFT' : 'TURN_RIGHT';
    }

    // QUY TẮC CỐT LÕI: CỨ THẤY CÓ MẮT MỞ LÀ AN TOÀN
    // Gục đầu chúi xuống (Head Forward) hay Nghiêng đầu (Tilt) chỉ tính là tư thế nguy hiểm/ngủ gục khi ĐỒNG THỜI MẮT NHẮM
    const isTiltingSideways = isTiltLeft || isTiltRight;
    const isForwardUnsafe = isHeadForward && isEyeClosed;
    const isTiltUnsafe = isTiltingSideways && isEyeClosed;
    const isPoseUnsafe = isForwardUnsafe || isTiltUnsafe;
    let isNewHeadDropDetected = false;

    if (isPoseUnsafe) {
      this.headRecoveredSinceMs = 0;
      if (this.lastHeadDropTimeMs === 0) {
        this.lastHeadDropTimeMs = nowMs;
      }
      this.currentHeadDropDurationMs = nowMs - this.lastHeadDropTimeMs;

      // Threshold: >= 350ms in drop posture with closed eyes
      if (this.currentHeadDropDurationMs >= CONFIG.MIN_HEAD_DROP_DURATION_MS) {
        this.isCurrentlyDropped = true;
        if (!this.dropRecordedForThisSession) {
          this.totalHeadDrops++;
          this.dropRecordedForThisSession = true;
          isNewHeadDropDetected = true;
        }
      }
    } else {
      // 200ms debounce to prevent momentary landmark fluctuation from resetting head drop episode
      if (this.lastHeadDropTimeMs > 0) {
        if (this.headRecoveredSinceMs === 0) {
          this.headRecoveredSinceMs = nowMs;
        }

        if (nowMs - this.headRecoveredSinceMs > 200) {
          this.lastHeadDropTimeMs = 0;
          this.currentHeadDropDurationMs = 0;
          this.isCurrentlyDropped = false;
          this.dropRecordedForThisSession = false;
          this.headRecoveredSinceMs = 0;
        }
      } else {
        this.headRecoveredSinceMs = 0;
        this.currentHeadDropDurationMs = 0;
        this.isCurrentlyDropped = false;
      }
    }

    return {
      metrics: {
        pitch: Math.round(pitchAngle),
        yaw: Math.round(yawAngle),
        roll: Math.round(rollAngle),
        isHeadDropped: this.isCurrentlyDropped,
        headDropDurationMs: this.currentHeadDropDurationMs,
        headDropCount: this.totalHeadDrops,
        poseType,
        isHeadForward,
        isTiltLeft,
        isTiltRight,
        isTurnedAway
      },
      isNewHeadDropDetected
    };
  }

  public getTotalHeadDrops(): number {
    return this.totalHeadDrops;
  }

  public reset(): void {
    this.lastHeadDropTimeMs = 0;
    this.currentHeadDropDurationMs = 0;
    this.totalHeadDrops = 0;
    this.isCurrentlyDropped = false;
    this.dropRecordedForThisSession = false;
    this.headRecoveredSinceMs = 0;
  }
}
