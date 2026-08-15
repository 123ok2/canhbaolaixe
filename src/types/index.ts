/**
 * Core type definitions for DriveGuard AI
 */

export enum DrowsinessState {
  ALERT = 'ALERT',             // 0 - 30: Tỉnh táo
  TIRED = 'TIRED',             // 31 - 60: Có dấu hiệu mệt mỏi
  WARNING = 'WARNING',         // 61 - 80: Nguy cơ buồn ngủ cao
  DANGER = 'DANGER'            // 81 - 100: Nguy hiểm
}

export interface EyeMetrics {
  leftEar: number;
  rightEar: number;
  averageEar: number;
  isClosed: boolean;
  closureDurationMs: number;
  blinkCount: number;
}

export interface YawnMetrics {
  mar: number; // Mouth Aspect Ratio
  isYawning: boolean;
  yawnDurationMs: number;
  yawnCount: number;
}

export interface HeadPoseMetrics {
  pitch: number; // Down / Up (- is down)
  yaw: number;   // Left / Right
  roll: number;  // Tilt left / right
  isHeadDropped: boolean;
  headDropDurationMs: number;
  headDropCount: number;
  poseType: 'DROP_FORWARD' | 'TILT_LEFT' | 'TILT_RIGHT' | 'TURN_LEFT' | 'TURN_RIGHT' | 'NORMAL';
  isHeadForward: boolean;
  isTiltLeft: boolean;
  isTiltRight: boolean;
  isTurnedAway: boolean;
}

export type DistractionType = 
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'LOOKING_DOWN'
  | 'LOOKING_UP'
  | 'FACE_AWAY'
  | 'NONE';

export type DistractionLevel = 'NONE' | 'MILD' | 'WARNING' | 'CRITICAL';

export interface DistractionMetrics {
  isDistracted: boolean;
  distractionType: DistractionType;
  distractionDurationMs: number;
  distractionCount: number;
  distractionLevel: DistractionLevel;
  distractionScore: number; // 0 - 100
  label: string; // e.g. "Quay đầu sang trái", "Cúi đầu nhìn điện thoại", "Tập trung tốt"
}

export interface CalibrationData {
  isCalibrated: boolean;
  isCalibrating: boolean;    // Whether user clicked "Bắt đầu hiệu chỉnh"
  baselineEar: number;      // Normal open eye EAR
  closedEarThreshold: number; // Dynamic threshold based on user
  baselineMar: number;      // Normal closed mouth MAR
  openMarThreshold: number;  // Dynamic yawn threshold
  samplesCount: number;
}

export type PrimaryAlertReason = 
  | 'EYES_CLOSED'
  | 'DROWSY_DROOP'
  | 'EARLY_DROWSINESS'
  | 'EARLY_DISTRACTION'
  | 'HEAD_DROP'
  | 'HEAD_TILT_SLEEP'
  | 'HEAD_TURNED'
  | 'FACE_LOST'
  | 'YAWN'
  | null;

export interface DrowsinessMetrics {
  score: number; // 0 - 100
  state: DrowsinessState;
  eyeMetrics: EyeMetrics;
  yawnMetrics: YawnMetrics;
  headPose: HeadPoseMetrics;
  distractionMetrics: DistractionMetrics;
  calibration: CalibrationData;
  isEnhancedMonitoring: boolean; // Activated after user clicks "TÔI ĐÃ TỈNH"
  faceDetected: boolean;
  faceLostDurationMs: number;
  primaryAlertReason: PrimaryAlertReason;
  wideEyesDurationMs: number;
  isWideEyesActive: boolean;
}

export type SensitivityLevel = 1 | 2 | 3 | 4 | 5;

export interface SensitivityConfig {
  level: SensitivityLevel;
  name: string;
  badge: string;
  description: string;
  recommendedFor: string;
  minEyeCloseMs: number;
  minHeadDropMs: number;
  pitchThreshold: number;
  faceLostMs: number;
  yawnDurationMs: number;
  scoreMultiplier: number;
}

export interface SessionStats {
  startTime: number;             // Timestamp ms
  driveDurationSeconds: number;  // Seconds
  longEyeClosureCount: number;   // Eyes closed > 0.8s
  yawnCount: number;             // Total yawns
  headDropCount: number;         // Total head drop events
  distractionCount: number;      // Total distraction events
  alertLevel1Count: number;
  alertLevel2Count: number;
  alertLevel3Count: number;
  totalDangerDurationSeconds: number;
  averageScore: number;
  scoreHistory: { timestamp: number; score: number; state: DrowsinessState }[];
}

export interface GeminiAnalysisReport {
  riskLevel: 'THẤP' | 'TRUNG BÌNH' | 'CAO' | 'CỰC KỲ NGUY HIỂM';
  summary: string;
  probableCauses: string[];
  observations: string[];
  recommendations: string[];
}

export type DemoModeState = 'NORMAL' | 'EYES_CLOSED' | 'YAWNING' | 'HEAD_DROP' | 'EXTREME_DANGER' | 'OFF';
