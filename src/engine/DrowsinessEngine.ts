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

  // Rolling window of frame scores for smoothing
  private scoreWindow: number[] = [];
  private currentScore: number = 0;
  private currentState: DrowsinessState = DrowsinessState.ALERT;
  private alertFramesStreak: number = 0;

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

    // Standard analysis
    const { metrics: eyeMetrics, isLongClosureEvent } = this.eyeAnalyzer.analyze(landmarks, nowMs, this.calibration);
    const { metrics: yawnMetrics, isNewYawnDetected } = this.yawnAnalyzer.analyze(landmarks, nowMs, this.calibration);
    const { metrics: headPose, isNewHeadDropDetected } = this.headPoseAnalyzer.analyze(landmarks, nowMs);

    // Record session events
    if (isLongClosureEvent) this.sessionManager.recordLongClosure();
    if (isNewYawnDetected) this.sessionManager.recordYawn();
    if (isNewHeadDropDetected) this.sessionManager.recordHeadDrop();

    // Track consecutive frames where user is completely alert (eyes open, mouth closed, head straight)
    const isFullyAlert = !eyeMetrics.isClosed && !yawnMetrics.isYawning && !headPose.isHeadDropped;
    if (isFullyAlert) {
      this.alertFramesStreak++;
    } else {
      this.alertFramesStreak = 0;
    }

    // Raw score calculation
    let frameScoreDelta = 0;

    // 1. Eye closure & early eyelid drooping impact
    if (eyeMetrics.isClosed) {
      const closureSec = eyeMetrics.closureDurationMs / 1000;
      if (closureSec >= 0.5) {
        frameScoreDelta += CONFIG.SCORE_EYE_CLOSED_WEIGHT * closureSec * (this.isEnhancedMonitoring ? 1.4 : 1.0);
      }
    } else if (eyeMetrics.averageEar < this.calibration.closedEarThreshold * 1.25) {
      // Early sign: Eyelid drooping / sleepy eyes (EAR near threshold)
      frameScoreDelta += 8 * (this.isEnhancedMonitoring ? 1.3 : 1.0);
    }

    // 2. Yawn & early mouth opening impact
    if (yawnMetrics.isYawning) {
      frameScoreDelta += CONFIG.SCORE_YAWN_WEIGHT * (this.isEnhancedMonitoring ? 1.3 : 1.0);
    } else if (yawnMetrics.mar > this.calibration.openMarThreshold * 0.70) {
      // Early sign: Mouth starting to open/yawn
      frameScoreDelta += 5 * (this.isEnhancedMonitoring ? 1.3 : 1.0);
    }

    // 3. Head pose posture impact (Forward drop, Left tilt, Right tilt, Turning away)
    if (headPose.isHeadForward) {
      const severity = Math.max(1.0, Math.abs(headPose.pitch) / 8);
      frameScoreDelta += CONFIG.SCORE_HEAD_DROP_WEIGHT * severity * (this.isEnhancedMonitoring ? 1.5 : 1.2);
    } else if (headPose.isTiltLeft || headPose.isTiltRight) {
      const severity = Math.max(1.0, Math.abs(headPose.roll) / 12);
      frameScoreDelta += CONFIG.SCORE_HEAD_DROP_WEIGHT * 0.9 * severity * (this.isEnhancedMonitoring ? 1.5 : 1.2);
    } else if (headPose.isTurnedAway) {
      frameScoreDelta += 12 * (this.isEnhancedMonitoring ? 1.4 : 1.1);
    } else if (headPose.pitch < -6 || Math.abs(headPose.roll) > 12) {
      // Early sign: Subtle micro-nod or side tilt
      frameScoreDelta += 6 * (this.isEnhancedMonitoring ? 1.3 : 1.0);
    }

    // Update current raw score
    let targetScore = this.currentScore;
    if (frameScoreDelta > 0) {
      targetScore = Math.min(100, targetScore + frameScoreDelta * 0.15);
    } else {
      // Natural decay towards zero when driver is alert
      // If alert streak >= 6 frames (~0.25s), accelerate decay rate to quickly dismiss modal
      const decayFactor = this.alertFramesStreak >= 6 ? 0.65 : CONFIG.SCORE_DECAY_RATE;
      targetScore = Math.max(0, targetScore * decayFactor);

      // If alert streak >= 10 frames (~0.4s) and targetScore drops below TIRED threshold,
      // flush high values in rolling window so average score immediately drops to clear alert modal
      if (this.alertFramesStreak >= 10 && targetScore < CONFIG.SCORE_STATE_TIRED) {
        targetScore = Math.min(15, targetScore);
        this.scoreWindow = this.scoreWindow.map(s => Math.min(s, targetScore));
      }
    }

    // Rolling window smoothing
    this.scoreWindow.push(targetScore);
    if (this.scoreWindow.length > CONFIG.ROLLING_WINDOW_SIZE) {
      this.scoreWindow.shift();
    }
    const smoothedScore = Math.round(
      this.scoreWindow.reduce((a, b) => a + b, 0) / (this.scoreWindow.length || 1)
    );

    this.currentScore = smoothedScore;

    // State transition with hysteresis to prevent oscillation
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
        isEnhancedMonitoring: this.isEnhancedMonitoring
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
      // Dynamic closed eye threshold based on driver's unique open EAR
      this.calibration.closedEarThreshold = Math.max(0.15, medianEar * CONFIG.EAR_CALIBRATION_RATIO);
      
      this.calibration.baselineMar = medianMar;
      this.calibration.openMarThreshold = Math.max(CONFIG.DEFAULT_MAR_YAWN_THRESHOLD, medianMar * 2.2);

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

  public setEnhancedMonitoring(durationMinutes: number = 5): void {
    this.isEnhancedMonitoring = true;
    this.enhancedMonitoringUntilMs = Date.now() + durationMinutes * 60 * 1000;
    // Reduce current score after user confirms awake
    this.currentScore = Math.max(20, this.currentScore - 40);
    this.updateStateWithHysteresis(this.currentScore);
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

    switch (this.demoModeState) {
      case 'NORMAL':
        score = 15;
        state = DrowsinessState.ALERT;
        break;
      case 'EYES_CLOSED':
        score = 68;
        state = DrowsinessState.WARNING;
        eyeClosed = true;
        closureDuration = 1200;
        break;
      case 'YAWNING':
        score = 48;
        state = DrowsinessState.TIRED;
        isYawning = true;
        break;
      case 'HEAD_DROP':
        score = 75;
        state = DrowsinessState.WARNING;
        isHeadDropped = true;
        pitch = -25;
        break;
      case 'EXTREME_DANGER':
        score = 92;
        state = DrowsinessState.DANGER;
        eyeClosed = true;
        closureDuration = 2500;
        isHeadDropped = true;
        pitch = -30;
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
          isTurnedAway: false
        },
        calibration: { ...this.calibration, isCalibrated: true },
        isEnhancedMonitoring: this.isEnhancedMonitoring
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
