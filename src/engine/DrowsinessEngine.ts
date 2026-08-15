/**
 * Master Drowsiness Engine
 * Combines Eye, Yawn, Head Pose analysis, rolling window smoothing,
 * dynamic calibration, Drowsiness Score calculation (0-100), hysteresis, and DEMO mode simulation.
 */

import { CONFIG } from '../config/constants';
import { CalibrationData, DemoModeState, DrowsinessMetrics, DrowsinessState } from '../types';

import { calculateEAR, EyeAnalyzer } from './EyeAnalysis';
import { HeadPoseAnalyzer } from './HeadPoseDetection';
import { SessionManager } from './SessionManager';
import { calculateMAR, YawnAnalyzer } from './YawnDetection';

interface Point3D {
  x: number;
  y: number;
  z?: number;
}

export class DrowsinessEngine {
  private eyeAnalyzer = new EyeAnalyzer();
  private yawnAnalyzer = new YawnAnalyzer();
  private headPoseAnalyzer = new HeadPoseAnalyzer();
  private sessionManager = new SessionManager();

  private calibration: CalibrationData = {
    isCalibrated: false,
    isCalibrating: false,
    baselineEar: 0.30,
    closedEarThreshold: CONFIG.DEFAULT_EAR_CLOSED_THRESHOLD,
    baselineMar: 0.20,
    openMarThreshold: CONFIG.DEFAULT_MAR_YAWN_THRESHOLD,
    samplesCount: 0
  };

  private calibrationEarSamples: number[] = [];
  private calibrationMarSamples: number[] = [];

  private scoreWindow: number[] = [];
  private currentScore: number = 0;
  private currentState: DrowsinessState = DrowsinessState.ALERT;
  private alertFramesStreak: number = 0;

  // Face lost tracking
  private faceLostSinceMs: number = 0;

  // Sensitivity level (1 to 5, default 3)
  private sensitivityLevel: import('../types').SensitivityLevel = 3;

  // Suppress alert temporarily when dismissed
  private suppressAlertUntilMs: number = 0;

  // Track wide open eyes duration (mở to mắt >= 1 giây tự động xóa cảnh báo)
  private wideEyesStartMs: number = 0;
  private wideEyesDurationMs: number = 0;

  // Enhanced monitoring flag activated when user clicks "TÔI ĐÃ TỈNH"
  private isEnhancedMonitoring: boolean = false;
  private enhancedMonitoringUntilMs: number = 0;

  // Demo mode state
  private demoModeState: DemoModeState = 'OFF';

  public processFrame(landmarks: Point3D[] | null, nowMs: number = Date.now()): {
    metrics: DrowsinessMetrics;
    isNewLongClosure: boolean;
    isNewYawn: boolean;
    isNewHeadDrop: boolean;
    stateChanged: boolean;
    previousState: DrowsinessState;
  } {
    const previousState = this.currentState;

    // Handle DEMO Mode override if active
    if (this.demoModeState !== 'OFF') {
      return this.processDemoFrame(nowMs, previousState);
    }

    // User-triggered calibration phase
    if (!this.calibration.isCalibrated && this.calibration.isCalibrating && landmarks) {
      this.collectCalibrationSample(landmarks);
    }

    const faceDetected = landmarks !== null && landmarks.length >= 400;
    let faceLostDurationMs = 0;
    let primaryAlertReason: import('../types').PrimaryAlertReason = null;

    // Track face lost / leaving camera frame
    if (!faceDetected) {
      if (this.calibration.isCalibrated) {
        if (this.faceLostSinceMs === 0) {
          this.faceLostSinceMs = nowMs;
        }
        faceLostDurationMs = nowMs - this.faceLostSinceMs;
      }
    } else {
      this.faceLostSinceMs = 0;
    }

    // Standard analysis
    const { metrics: eyeMetrics, isLongClosureEvent } = this.eyeAnalyzer.analyze(landmarks, nowMs, this.calibration);
    const { metrics: yawnMetrics, isNewYawnDetected } = this.yawnAnalyzer.analyze(landmarks, nowMs, this.calibration);
    // Strict eye closed check for head tilt: must be actually closed (EAR < closed threshold)
    const { metrics: headPose, isNewHeadDropDetected } = this.headPoseAnalyzer.analyze(landmarks, nowMs, eyeMetrics.isClosed);

    // Record session events
    if (isLongClosureEvent) this.sessionManager.recordLongClosure();
    if (isNewYawnDetected) this.sessionManager.recordYawn();
    if (isNewHeadDropDetected) this.sessionManager.recordHeadDrop();

    // Track wide open eyes: mở to mắt hơn bình thường (EAR mở rõ ràng)
    const wideEarThreshold = this.calibration.isCalibrated
      ? Math.max(0.24, this.calibration.baselineEar * 0.88)
      : 0.25;
    const isEyesWideOpen = faceDetected && !eyeMetrics.isClosed && eyeMetrics.averageEar >= wideEarThreshold;

    if (isEyesWideOpen) {
      if (this.wideEyesStartMs === 0) {
        this.wideEyesStartMs = nowMs;
      }
      this.wideEyesDurationMs = nowMs - this.wideEyesStartMs;

      // QUY TẮC: Mở to mắt >= 1 giây (1000ms) -> CẢNH BÁO TỰ BIẾN MẤT NGAY LẬP TỨC
      if (this.wideEyesDurationMs >= 1000) {
        if (this.currentState !== DrowsinessState.ALERT || this.currentScore > 0) {
          this.dismissAlertImmediate();
        }
      }
    } else {
      this.wideEyesStartMs = 0;
      this.wideEyesDurationMs = 0;
    }

    // Track consecutive frames where user is completely alert (eyes open, mouth closed, head straight, face detected)
    const isFullyAlert = faceDetected && !eyeMetrics.isClosed && !yawnMetrics.isYawning && !headPose.isHeadDropped && !headPose.isTurnedAway;
    if (isFullyAlert) {
      this.alertFramesStreak++;
    } else {
      this.alertFramesStreak = 0;
    }

    // Check if within suppression grace period after manual dismiss
    const isSuppressed = nowMs < this.suppressAlertUntilMs;

    // Sensitivity configuration thresholds
    const sensConfig = CONFIG.SENSITIVITY_PRESETS[this.sensitivityLevel] || CONFIG.SENSITIVITY_PRESETS[3];

    // Raw score calculation & immediate priority triggers
    let targetScore = this.currentScore;
    let immediateHighRisk = false;

    // 1. Check Face Lost / Looking Away from Camera (Rời mặt khỏi camera)
    if (faceLostDurationMs >= sensConfig.faceLostMs) {
      primaryAlertReason = 'FACE_LOST';
      immediateHighRisk = true;
      if (faceLostDurationMs >= sensConfig.faceLostMs * 2.2) {
        targetScore = Math.max(targetScore, 92);
      } else {
        targetScore = Math.max(targetScore, 70);
      }
    }

    // 2. Head drop / Tilt posture (Quy tắc: Cứ thấy có mắt mở là an toàn, chỉ cảnh báo khi ĐỒNG THỜI nhắm mắt)
    const isHeadDropPitch = headPose.pitch < sensConfig.pitchThreshold;
    const isTiltingSideways = headPose.isTiltLeft || headPose.isTiltRight;
    
    // QUY TẮC CỐT LÕI: Gục đầu cúi xuống hoặc Nghiêng đầu PHẢI ĐỒNG THỜI NHẮM MẮT mới kích hoạt cảnh báo ngủ gật
    const isDropForwardWithEyesClosed = (isHeadDropPitch || headPose.isHeadForward) && eyeMetrics.isClosed;
    const isTiltWithEyesClosed = isTiltingSideways && eyeMetrics.isClosed;
    const isUnsafeHeadPoseActive = isDropForwardWithEyesClosed || isTiltWithEyesClosed;

    if (isUnsafeHeadPoseActive) {
      if (headPose.headDropDurationMs >= sensConfig.minHeadDropMs) {
        // Phân biệt chính xác lý do cảnh báo
        if (isDropForwardWithEyesClosed) {
          primaryAlertReason = 'HEAD_DROP';
        } else if (isTiltWithEyesClosed) {
          primaryAlertReason = 'HEAD_TILT_SLEEP';
        }
        immediateHighRisk = true;
        if (headPose.headDropDurationMs >= sensConfig.minHeadDropMs * 2.8) {
          targetScore = Math.max(targetScore, 94);
        } else {
          targetScore = Math.max(targetScore, 76);
        }
      }
    }

    // 3. Eye closure / Long blink / Sleepy eyes (Nhắm mắt quá thời gian quy định -> Kích hoạt ngay CẢNH BÁO MẠNH CẤP 3)
    if (eyeMetrics.isClosed) {
      if (eyeMetrics.closureDurationMs >= sensConfig.minEyeCloseMs) {
        primaryAlertReason = 'EYES_CLOSED';
        immediateHighRisk = true;
        // Nhắm mắt đủ thời gian -> Lập tức kích hoạt điểm nguy hiểm tối đa (Cảnh báo mạnh Level 3)
        targetScore = 100;
      } else {
        const closureSec = eyeMetrics.closureDurationMs / 1000;
        targetScore = Math.min(100, targetScore + CONFIG.SCORE_EYE_CLOSED_WEIGHT * closureSec * 0.4 * sensConfig.scoreMultiplier);
      }
    } else if (faceDetected && eyeMetrics.averageEar < this.calibration.closedEarThreshold * 1.25) {
      if (!primaryAlertReason) primaryAlertReason = 'DROWSY_DROOP';
      targetScore = Math.min(100, targetScore + 6 * sensConfig.scoreMultiplier * (this.isEnhancedMonitoring ? 1.4 : 1.0));
    }

    // 4. Yawn Detection (Ngáp)
    if (yawnMetrics.isYawning) {
      if (!primaryAlertReason) primaryAlertReason = 'YAWN';
      targetScore = Math.max(targetScore, 48);
    }

    // If no urgent alerts and driver is alert, decay score smoothly
    if (!immediateHighRisk && isFullyAlert) {
      const decayFactor = this.alertFramesStreak >= 6 ? 0.65 : CONFIG.SCORE_DECAY_RATE;
      targetScore = Math.max(0, targetScore * decayFactor);

      if (this.alertFramesStreak >= 10 && targetScore < CONFIG.SCORE_STATE_TIRED) {
        targetScore = Math.min(15, targetScore);
        this.scoreWindow = this.scoreWindow.map(s => Math.min(s, targetScore));
      }
    }

    if (isSuppressed) {
      targetScore = Math.min(targetScore, 10);
      immediateHighRisk = false;
      primaryAlertReason = null;
    }

    // Fast-path escalation: If immediate high risk, force rolling window to reflect it instantly
    if (immediateHighRisk) {
      this.scoreWindow = this.scoreWindow.map(s => Math.max(s, targetScore * 0.9));
      this.scoreWindow.push(targetScore);
    } else {
      this.scoreWindow.push(targetScore);
    }

    if (this.scoreWindow.length > CONFIG.ROLLING_WINDOW_SIZE) {
      this.scoreWindow.shift();
    }

    const smoothedScore = Math.round(
      this.scoreWindow.reduce((a, b) => a + b, 0) / (this.scoreWindow.length || 1)
    );

    this.currentScore = immediateHighRisk ? Math.max(smoothedScore, targetScore) : smoothedScore;

    // State transition with hysteresis
    this.updateStateWithHysteresis(this.currentScore);

    // Record session frame
    this.sessionManager.recordFrame(this.currentScore, this.currentState, nowMs);

    // Check if enhanced monitoring timer expired (5 minutes)
    if (this.isEnhancedMonitoring && nowMs > this.enhancedMonitoringUntilMs) {
      this.isEnhancedMonitoring = false;
    }

    const stateChanged = this.currentState !== previousState;

    return {
      metrics: {
        score: this.currentScore,
        state: this.currentState,
        eyeMetrics,
        yawnMetrics,
        headPose,
        calibration: { ...this.calibration },
        isEnhancedMonitoring: this.isEnhancedMonitoring,
        faceDetected,
        faceLostDurationMs,
        primaryAlertReason,
        wideEyesDurationMs: this.wideEyesDurationMs,
        isWideEyesActive: isEyesWideOpen
      },
      isNewLongClosure: isLongClosureEvent,
      isNewYawn: isNewYawnDetected,
      isNewHeadDrop: isNewHeadDropDetected,
      stateChanged,
      previousState
    };
  }

  private updateStateWithHysteresis(score: number): void {
    const margin = CONFIG.HYSTERESIS_MARGIN;

    if (this.currentState === DrowsinessState.ALERT) {
      if (score >= CONFIG.SCORE_STATE_DANGER) this.currentState = DrowsinessState.DANGER;
      else if (score >= CONFIG.SCORE_STATE_WARNING) this.currentState = DrowsinessState.WARNING;
      else if (score >= CONFIG.SCORE_STATE_TIRED) this.currentState = DrowsinessState.TIRED;
    } else if (this.currentState === DrowsinessState.TIRED) {
      if (score >= CONFIG.SCORE_STATE_DANGER) this.currentState = DrowsinessState.DANGER;
      else if (score >= CONFIG.SCORE_STATE_WARNING) this.currentState = DrowsinessState.WARNING;
      else if (score < CONFIG.SCORE_STATE_TIRED - margin) this.currentState = DrowsinessState.ALERT;
    } else if (this.currentState === DrowsinessState.WARNING) {
      if (score >= CONFIG.SCORE_STATE_DANGER) this.currentState = DrowsinessState.DANGER;
      else if (score < CONFIG.SCORE_STATE_TIRED - margin) this.currentState = DrowsinessState.ALERT;
      else if (score < CONFIG.SCORE_STATE_WARNING - margin) this.currentState = DrowsinessState.TIRED;
    } else if (this.currentState === DrowsinessState.DANGER) {
      if (score < CONFIG.SCORE_STATE_TIRED - margin) this.currentState = DrowsinessState.ALERT;
      else if (score < CONFIG.SCORE_STATE_DANGER - margin) this.currentState = DrowsinessState.WARNING;
    }
  }

  private collectCalibrationSample(landmarks: Point3D[]): void {
    const leftEar = calculateEAR(landmarks, CONFIG.FACEMESH_LEFT_EYE);
    const rightEar = calculateEAR(landmarks, CONFIG.FACEMESH_RIGHT_EYE);
    const avgEar = (leftEar + rightEar) / 2.0;
    const mar = calculateMAR(landmarks);

    this.calibrationEarSamples.push(avgEar);
    this.calibrationMarSamples.push(mar);
    this.calibration.samplesCount++;

    if (this.calibration.samplesCount >= CONFIG.CALIBRATION_FRAMES_REQUIRED) {
      // Calculate median / average for baseline
      const sortedEar = [...this.calibrationEarSamples].sort((a, b) => a - b);
      const medianEar = sortedEar[Math.floor(sortedEar.length / 2)];

      const sortedMar = [...this.calibrationMarSamples].sort((a, b) => a - b);
      const medianMar = sortedMar[Math.floor(sortedMar.length / 2)];

      this.calibration.baselineEar = medianEar;
      // Dynamic closed eye threshold based on driver's unique open EAR (~68% of baseline, min 0.185)
      this.calibration.closedEarThreshold = Math.max(0.185, Math.min(0.24, medianEar * CONFIG.EAR_CALIBRATION_RATIO));
      
      this.calibration.baselineMar = medianMar;
      // Dynamic yawn threshold based on driver's unique mouth baseline (between 0.45 and 0.54)
      const calculatedMarThreshold = Math.max(0.45, Math.min(0.54, medianMar * 1.7));
      this.calibration.openMarThreshold = calculatedMarThreshold;

      this.calibration.isCalibrated = true;
      this.calibration.isCalibrating = false;
    }
  }

  public openCalibration(): void {
    this.calibrationEarSamples = [];
    this.calibrationMarSamples = [];
    this.calibration.samplesCount = 0;
    this.calibration.isCalibrated = false;
    this.calibration.isCalibrating = false;
    this.currentScore = 0;
    this.currentState = DrowsinessState.ALERT;
  }

  public beginCalibrationSampling(): void {
    this.calibrationEarSamples = [];
    this.calibrationMarSamples = [];
    this.calibration.samplesCount = 0;
    this.calibration.isCalibrated = false;
    this.calibration.isCalibrating = true;
    this.currentScore = 0;
    this.currentState = DrowsinessState.ALERT;
  }

  public skipCalibration(): void {
    this.calibration.isCalibrated = true;
    this.calibration.isCalibrating = false;
    this.calibration.baselineEar = 0.30;
    this.calibration.closedEarThreshold = CONFIG.DEFAULT_EAR_CLOSED_THRESHOLD;
    this.calibration.baselineMar = 0.20;
    this.calibration.openMarThreshold = CONFIG.DEFAULT_MAR_YAWN_THRESHOLD;
    this.currentScore = 0;
    this.currentState = DrowsinessState.ALERT;
  }

  public dismissAlertImmediate(): void {
    // Immediately clear all high scores and reset state to ALERT (Safe)
    this.currentScore = 0;
    this.scoreWindow = [0, 0, 0, 0, 0];
    this.currentState = DrowsinessState.ALERT;
    this.alertFramesStreak = 15;
    // Suppress re-triggering for 2.5 seconds to prevent spamming while driver returns to normal driving
    this.suppressAlertUntilMs = Date.now() + 2500;
  }

  public setEnhancedMonitoring(durationMinutes: number = 5): void {
    this.isEnhancedMonitoring = true;
    this.enhancedMonitoringUntilMs = Date.now() + durationMinutes * 60 * 1000;
    // Reduce current score after user confirms awake
    this.dismissAlertImmediate();
  }

  public setSensitivity(level: import('../types').SensitivityLevel): void {
    this.sensitivityLevel = level;
  }

  public getSensitivity(): import('../types').SensitivityLevel {
    return this.sensitivityLevel;
  }

  public getSensitivityConfig(): import('../types').SensitivityConfig {
    return CONFIG.SENSITIVITY_PRESETS[this.sensitivityLevel] || CONFIG.SENSITIVITY_PRESETS[3];
  }

  public setDemoMode(mode: DemoModeState): void {
    this.demoModeState = mode;
  }

  public getDemoMode(): DemoModeState {
    return this.demoModeState;
  }

  private processDemoFrame(nowMs: number, previousState: DrowsinessState) {
    let score = 10;
    let state = DrowsinessState.ALERT;
    let eyeClosed = false;
    let closureDuration = 0;
    let isYawning = false;
    let isHeadDropped = false;
    let pitch = 0;

    let isTurnedAway = false;
    let primaryAlertReason: import('../types').PrimaryAlertReason = null;

    switch (this.demoModeState) {
      case 'NORMAL':
        score = 15;
        state = DrowsinessState.ALERT;
        break;
      case 'EYES_CLOSED':
        score = 75;
        state = DrowsinessState.WARNING;
        eyeClosed = true;
        closureDuration = 1200;
        primaryAlertReason = 'EYES_CLOSED';
        break;
      case 'YAWNING':
        score = 50;
        state = DrowsinessState.TIRED;
        isYawning = true;
        primaryAlertReason = 'YAWN';
        break;
      case 'HEAD_DROP':
        score = 78;
        state = DrowsinessState.WARNING;
        isHeadDropped = true;
        pitch = -25;
        primaryAlertReason = 'HEAD_DROP';
        break;
      case 'EXTREME_DANGER':
        score = 95;
        state = DrowsinessState.DANGER;
        eyeClosed = true;
        closureDuration = 2500;
        isHeadDropped = true;
        pitch = -30;
        primaryAlertReason = 'HEAD_DROP';
        break;
    }

    this.currentScore = score;
    this.currentState = state;

    this.sessionManager.recordFrame(this.currentScore, this.currentState, nowMs);

    return {
      metrics: {
        score,
        state,
        eyeMetrics: {
          leftEar: eyeClosed ? 0.12 : 0.32,
          rightEar: eyeClosed ? 0.12 : 0.32,
          averageEar: eyeClosed ? 0.12 : 0.32,
          isClosed: eyeClosed,
          closureDurationMs: closureDuration,
          blinkCount: 14
        },
        yawnMetrics: {
          mar: isYawning ? 0.68 : 0.18,
          isYawning,
          yawnDurationMs: isYawning ? 2200 : 0,
          yawnCount: isYawning ? 3 : 1
        },
        headPose: {
          pitch,
          yaw: 0,
          roll: 0,
          isHeadDropped,
          headDropDurationMs: isHeadDropped ? 1400 : 0,
          headDropCount: isHeadDropped ? 2 : 0,
          poseType: (isHeadDropped ? 'DROP_FORWARD' : 'NORMAL') as 'DROP_FORWARD' | 'NORMAL',
          isHeadForward: isHeadDropped,
          isTiltLeft: false,
          isTiltRight: false,
          isTurnedAway
        },
        calibration: { ...this.calibration, isCalibrated: true },
        isEnhancedMonitoring: this.isEnhancedMonitoring,
        faceDetected: true,
        faceLostDurationMs: 0,
        primaryAlertReason,
        wideEyesDurationMs: 0,
        isWideEyesActive: !eyeClosed
      },
      isNewLongClosure: eyeClosed,
      isNewYawn: isYawning,
      isNewHeadDrop: isHeadDropped,
      stateChanged: this.currentState !== previousState,
      previousState
    };
  }

  public getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  public resetSession(): void {
    this.eyeAnalyzer.reset();
    this.yawnAnalyzer.reset();
    this.headPoseAnalyzer.reset();
    this.sessionManager.reset();
    this.currentScore = 0;
    this.currentState = DrowsinessState.ALERT;
    this.scoreWindow = [];
  }
}
