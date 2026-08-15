/**
 * Head Pose Detection Engine - Estimates Pitch, Yaw, Roll, Head Drop, and Driver Distraction
 */

import { CONFIG } from '../config/constants';
import { DistractionLevel, DistractionMetrics, DistractionType, HeadPoseMetrics } from '../types';

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

  // Distraction tracking
  private lastDistractionTimeMs: number = 0;
  private currentDistractionDurationMs: number = 0;
  private totalDistractions: number = 0;
  private distractionRecordedForThisSession: boolean = false;
  private distractionRecoveredSinceMs: number = 0;

  // Debounce for momentary head posture flicker
  private headRecoveredSinceMs: number = 0;

  public analyze(
    landmarks: Point3D[] | null,
    nowMs: number,
    isEyeClosed: boolean = false,
    faceDetected: boolean = true
  ): {
    metrics: HeadPoseMetrics;
    distractionMetrics: DistractionMetrics;
    isNewHeadDropDetected: boolean;
    isNewDistractionDetected: boolean;
  } {
    if (!landmarks || landmarks.length < 400 || !faceDetected) {
      // If face is missing, analyze face away distraction
      const isDistractedByFaceLost = !faceDetected;
      if (isDistractedByFaceLost) {
        if (this.lastDistractionTimeMs === 0) {
          this.lastDistractionTimeMs = nowMs;
        }
        this.currentDistractionDurationMs = nowMs - this.lastDistractionTimeMs;
        if (this.currentDistractionDurationMs >= 1500 && !this.distractionRecordedForThisSession) {
          this.totalDistractions++;
          this.distractionRecordedForThisSession = true;
        }
      }

      const distLevel: DistractionLevel = 
        this.currentDistractionDurationMs >= 3000 ? 'CRITICAL' :
        this.currentDistractionDurationMs >= 1500 ? 'WARNING' :
        this.currentDistractionDurationMs >= 800 ? 'MILD' : 'NONE';

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
          isTurnedAway: true
        },
        distractionMetrics: {
          isDistracted: isDistractedByFaceLost && this.currentDistractionDurationMs >= 800,
          distractionType: 'FACE_AWAY',
          distractionDurationMs: this.currentDistractionDurationMs,
          distractionCount: this.totalDistractions,
          distractionLevel: distLevel,
          distractionScore: Math.min(100, Math.round((this.currentDistractionDurationMs / 3000) * 100)),
          label: 'Rời mặt khỏi đường'
        },
        isNewHeadDropDetected: false,
        isNewDistractionDetected: false
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

    // --- 1. HEAD DROP SLEEP DETECTION (Khi đầu gục/nghiêng ĐỒNG THỜI MẮT NHẮM) ---
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

    // --- 2. DISTRACTION DETECTION (MẤT TẬP TRUNG: Quay đầu / Cúi đầu nhìn điện thoại / Ngước nhìn khi MẮT MỞ) ---
    let distractionType: DistractionType = 'NONE';
    let distractionLabel = 'Tập trung tốt';
    let isPhysicallyDistracted = false;

    if (yawAngle < -CONFIG.HEAD_TURN_YAW_THRESHOLD) {
      distractionType = 'TURN_LEFT';
      distractionLabel = 'Quay đầu sang trái';
      isPhysicallyDistracted = true;
    } else if (yawAngle > CONFIG.HEAD_TURN_YAW_THRESHOLD) {
      distractionType = 'TURN_RIGHT';
      distractionLabel = 'Quay đầu sang phải';
      isPhysicallyDistracted = true;
    } else if (pitchAngle < -11 && !isEyeClosed) {
      // Cúi đầu nhìn điện thoại / taplo xe trong khi mắt vẫn mở
      distractionType = 'LOOKING_DOWN';
      distractionLabel = 'Cúi đầu nhìn điện thoại/taplo';
      isPhysicallyDistracted = true;
    } else if (pitchAngle > 18) {
      // Ngước nhìn lên trần xe lơ đãng
      distractionType = 'LOOKING_UP';
      distractionLabel = 'Ngước nhìn lơ đãng';
      isPhysicallyDistracted = true;
    }

    let isNewDistractionDetected = false;

    if (isPhysicallyDistracted) {
      this.distractionRecoveredSinceMs = 0;
      if (this.lastDistractionTimeMs === 0) {
        this.lastDistractionTimeMs = nowMs;
      }
      this.currentDistractionDurationMs = nowMs - this.lastDistractionTimeMs;

      // Track session occurrence when distracted > 1.6s
      if (this.currentDistractionDurationMs >= 1600 && !this.distractionRecordedForThisSession) {
        this.totalDistractions++;
        this.distractionRecordedForThisSession = true;
        isNewDistractionDetected = true;
      }
    } else {
      // Debounce recovery to avoid flickering on micro head movements
      if (this.lastDistractionTimeMs > 0) {
        if (this.distractionRecoveredSinceMs === 0) {
          this.distractionRecoveredSinceMs = nowMs;
        }

        if (nowMs - this.distractionRecoveredSinceMs > 250) {
          this.lastDistractionTimeMs = 0;
          this.currentDistractionDurationMs = 0;
          this.distractionRecordedForThisSession = false;
          this.distractionRecoveredSinceMs = 0;
        }
      } else {
        this.distractionRecoveredSinceMs = 0;
        this.currentDistractionDurationMs = 0;
      }
    }

    // Determine Distraction Level based on duration:
    // < 800ms: NONE (Normal quick mirror glance)
    // 800ms - 1599ms: MILD (HUD Visual Early Warning)
    // 1600ms - 2999ms: WARNING (Audio Voice Alert + Orange Alert)
    // >= 3000ms: CRITICAL (Urgent Alert + High Risk Score)
    let distractionLevel: DistractionLevel = 'NONE';
    if (this.currentDistractionDurationMs >= 3000) {
      distractionLevel = 'CRITICAL';
    } else if (this.currentDistractionDurationMs >= 1600) {
      distractionLevel = 'WARNING';
    } else if (this.currentDistractionDurationMs >= 800) {
      distractionLevel = 'MILD';
    }

    const distractionScore = Math.min(100, Math.round((this.currentDistractionDurationMs / 3000) * 100));

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
      distractionMetrics: {
        isDistracted: isPhysicallyDistracted && this.currentDistractionDurationMs >= 800,
        distractionType,
        distractionDurationMs: this.currentDistractionDurationMs,
        distractionCount: this.totalDistractions,
        distractionLevel,
        distractionScore,
        label: isPhysicallyDistracted ? distractionLabel : 'Tập trung tốt'
      },
      isNewHeadDropDetected,
      isNewDistractionDetected
    };
  }

  public getTotalHeadDrops(): number {
    return this.totalHeadDrops;
  }

  public getTotalDistractions(): number {
    return this.totalDistractions;
  }

  public reset(): void {
    this.lastHeadDropTimeMs = 0;
    this.currentHeadDropDurationMs = 0;
    this.totalHeadDrops = 0;
    this.isCurrentlyDropped = false;
    this.dropRecordedForThisSession = false;
    this.headRecoveredSinceMs = 0;

    this.lastDistractionTimeMs = 0;
    this.currentDistractionDurationMs = 0;
    this.totalDistractions = 0;
    this.distractionRecordedForThisSession = false;
    this.distractionRecoveredSinceMs = 0;
  }
}

