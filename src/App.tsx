/**
 * DriveGuard AI - Main Application Component
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertModal } from './components/AlertModal';
import { CalibrationModal } from './components/CalibrationModal';
import { CameraFeed } from './components/CameraFeed';
import { CameraPermissionModal } from './components/CameraPermissionModal';
import { DashboardStats } from './components/DashboardStats';
import { DemoControlPanel } from './components/DemoControlPanel';
import { DrowsinessGauge } from './components/DrowsinessGauge';
import { Header } from './components/Header';
import { PrivacyHeader } from './components/PrivacyHeader';
import { CONFIG } from './config/constants';
import { DrowsinessEngine } from './engine/DrowsinessEngine';
import { useAudioAlerts } from './hooks/useAudioAlerts';
import { useCamera } from './hooks/useCamera';
import { faceLandmarkService } from './services/FaceLandmarkService';
import {
  CalibrationData,
  DemoModeState,
  DrowsinessMetrics,
  DrowsinessState,
  SensitivityLevel,
  SessionStats,
} from './types';

// Instantiate core engine singleton for app lifetime
const engine = new DrowsinessEngine();

export default function App() {
  const { videoRef, stream, cameraState, startCamera } = useCamera();
  const {
    initAudioContext,
    playLevel1Alert,
    playLevel2Alert,
    playLevel3Alert,
    stopActiveAlert,
    speakVoiceAlert,
    isMuted,
    toggleMute
  } = useAudioAlerts();

  // Engine state React state variables
  const [metrics, setMetrics] = useState<DrowsinessMetrics>({
    score: 0,
    state: DrowsinessState.ALERT,
    eyeMetrics: { leftEar: 0.3, rightEar: 0.3, averageEar: 0.3, isClosed: false, closureDurationMs: 0, blinkCount: 0 },
    yawnMetrics: { mar: 0.2, isYawning: false, yawnDurationMs: 0, yawnCount: 0 },
    headPose: { pitch: 0, yaw: 0, roll: 0, isHeadDropped: false, headDropDurationMs: 0, headDropCount: 0, poseType: 'NORMAL', isHeadForward: false, isTiltLeft: false, isTiltRight: false, isTurnedAway: false },
    calibration: { isCalibrated: false, isCalibrating: false, baselineEar: 0.3, closedEarThreshold: 0.2, baselineMar: 0.2, openMarThreshold: 0.55, samplesCount: 0 },
    isEnhancedMonitoring: false,
    faceDetected: true,
    faceLostDurationMs: 0,
    primaryAlertReason: null
  });

  const [landmarks, setLandmarks] = useState<any[] | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats>(engine.getSessionManager().getStats());

  // Modals & Panels state
  const [isDemoOpen, setIsDemoOpen] = useState<boolean>(false);
  const [isFaceLandmarkerLoading, setIsFaceLandmarkerLoading] = useState<boolean>(true);

  // Sensitivity Setting State (1 to 5, default 3)
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('driveguard_sensitivity');
        if (saved) {
          const num = parseInt(saved, 10);
          if (num >= 1 && num <= 5) return num as SensitivityLevel;
        }
      } catch {
        // LocalStorage fallback
      }
    }
    return 3;
  });

  // Apply sensitivity to engine on mount & change
  useEffect(() => {
    engine.setSensitivity(sensitivity);
  }, [sensitivity]);

  const handleSensitivityChange = useCallback((level: SensitivityLevel) => {
    setSensitivity(level);
    engine.setSensitivity(level);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('driveguard_sensitivity', String(level));
      } catch {
        // LocalStorage fallback
      }
    }
  }, []);

  const handleSensitivityFeedback = useCallback((level: SensitivityLevel) => {
    initAudioContext();
    // Play a gentle pitch corresponding to level (Level 1: 440Hz -> Level 5: 880Hz)
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const freqMap: Record<SensitivityLevel, number> = { 1: 440, 2: 523.25, 3: 659.25, 4: 783.99, 5: 987.77 };
        osc.frequency.setValueAtTime(freqMap[level] || 659.25, ctx.currentTime);
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch {
      // Audio feedback catch
    }
  }, [initAudioContext]);

  // Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    let isMounted = true;
    async function initMediaPipe() {
      setIsFaceLandmarkerLoading(true);
      await faceLandmarkService.initialize();
      if (isMounted) setIsFaceLandmarkerLoading(false);
    }
    initMediaPipe();

    return () => {
      isMounted = false;
    };
  }, []);

  // Request Camera on initial load
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  // Main Realtime Frame Processing Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastInferenceTimeMs = 0;

    const processLoop = () => {
      const now = Date.now();
      const intervalMs = 1000 / CONFIG.MAX_INFERENCE_FPS;

      if (now - lastInferenceTimeMs >= intervalMs) {
        lastInferenceTimeMs = now;

        const video = videoRef.current;
        const isStreaming = cameraState.isStreaming;
        const demoMode = engine.getDemoMode();

        let currentLandmarks: any[] | null = null;

        if (video && isStreaming && faceLandmarkService.getIsReady()) {
          currentLandmarks = faceLandmarkService.detectForVideo(video, now);
        }

        if (isStreaming || demoMode !== 'OFF') {
          setLandmarks(currentLandmarks);

          const result = engine.processFrame(currentLandmarks, now);
          setMetrics(result.metrics);

          // Update session stats
          const newStats = engine.getSessionManager().getStats();
          setSessionStats(newStats);

          // Immediate Alert triggers on state change or danger
          if (result.stateChanged) {
            initAudioContext();

            if (result.metrics.state === DrowsinessState.TIRED) {
              playLevel1Alert(result.metrics.primaryAlertReason);
              engine.getSessionManager().recordAlertLevel(1);
            } else if (result.metrics.state === DrowsinessState.WARNING) {
              playLevel2Alert(result.metrics.primaryAlertReason);
              engine.getSessionManager().recordAlertLevel(2);
            } else if (result.metrics.state === DrowsinessState.DANGER) {
              playLevel3Alert(result.metrics.primaryAlertReason);
              engine.getSessionManager().recordAlertLevel(3);
            } else if (result.metrics.state === DrowsinessState.ALERT) {
              stopActiveAlert();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(processLoop);
    };

    animationFrameId = requestAnimationFrame(processLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [cameraState.isStreaming, videoRef, initAudioContext, playLevel1Alert, playLevel2Alert, playLevel3Alert, stopActiveAlert]);

  // "TÔI ĐÃ TỈNH" Click Handler
  const handleConfirmAwake = useCallback(() => {
    stopActiveAlert();
    engine.setEnhancedMonitoring(5); // 5 minutes enhanced monitoring
  }, [stopActiveAlert]);

  // Instant 'X' / Backdrop / Key Dismissal (Không làm phiền lái xe)
  const handleDismissInstant = useCallback(() => {
    stopActiveAlert();
    engine.dismissAlertImmediate();
  }, [stopActiveAlert]);

  // Demo Mode Handler
  const handleSelectDemoMode = useCallback((mode: DemoModeState) => {
    engine.setDemoMode(mode);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Header Bar */}
      <Header
        currentState={metrics.state}
        score={metrics.score}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onOpenDemo={() => setIsDemoOpen(true)}
        onRecalibrate={() => engine.openCalibration()}
        isEnhancedMonitoring={metrics.isEnhancedMonitoring}
        sensitivityLevel={sensitivity}
      />

      {/* Privacy & Safety Disclaimer Banner */}
      <PrivacyHeader />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Upper Grid: Camera Feed + Drowsiness Gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
          {/* Camera Feed View (Takes 2 Columns on Large Screens) with Integrated Sensitivity Controls */}
          <div className="lg:col-span-2 space-y-2">
            <CameraFeed
              videoRef={videoRef}
              isStreaming={cameraState.isStreaming}
              landmarks={landmarks}
              state={metrics.state}
              score={metrics.score}
              calibration={metrics.calibration}
              eyeMetrics={metrics.eyeMetrics}
              yawnMetrics={metrics.yawnMetrics}
              headPose={metrics.headPose}
              faceDetected={metrics.faceDetected}
              primaryAlertReason={metrics.primaryAlertReason}
              sensitivityLevel={sensitivity}
              onChangeSensitivity={handleSensitivityChange}
              onPlayFeedback={handleSensitivityFeedback}
            />
          </div>

          {/* Drowsiness Score Circular Gauge (Takes 1 Column) */}
          <div className="lg:col-span-1">
            <DrowsinessGauge
              score={metrics.score}
              state={metrics.state}
              eyeMetrics={metrics.eyeMetrics}
              yawnMetrics={metrics.yawnMetrics}
              headPose={metrics.headPose}
            />
          </div>
        </div>

        {/* Lower Dashboard Section: Driving Stats & Realtime Chart */}
        <DashboardStats
          stats={sessionStats}
          currentScore={metrics.score}
        />
      </main>

      {/* Camera Permission Modal (Shows if permission pending or denied AND DEMO mode is OFF) */}
      {engine.getDemoMode() === 'OFF' && (cameraState.hasPermission === false || (!cameraState.isStreaming && cameraState.error)) && (
        <CameraPermissionModal
          error={cameraState.error}
          onGrantPermission={startCamera}
          onStartDemo={() => handleSelectDemoMode('NORMAL')}
          isLoading={isFaceLandmarkerLoading}
        />
      )}

      {/* Initial Facial Calibration Modal */}
      {engine.getDemoMode() === 'OFF' && (
        <CalibrationModal
          isStreaming={cameraState.isStreaming}
          hasLandmarks={landmarks !== null && landmarks.length > 0}
          landmarks={landmarks}
          calibration={metrics.calibration}
          stream={stream}
          videoRef={videoRef}
          onBeginCalibration={() => engine.beginCalibrationSampling()}
          onSkip={() => engine.skipCalibration()}
        />
      )}

      {/* Drowsiness Alert Modal (Level 1, Level 2, Level 3) with "TÔI ĐÃ TỈNH" and 'X' Button */}
      <AlertModal
        state={metrics.state}
        score={metrics.score}
        primaryAlertReason={metrics.primaryAlertReason}
        wideEyesDurationMs={metrics.wideEyesDurationMs}
        isWideEyesActive={metrics.isWideEyesActive}
        onConfirmAwake={handleConfirmAwake}
        onDismissInstant={handleDismissInstant}
        isMuted={isMuted}
      />

      {/* Demo Simulation Control Panel Modal */}
      {isDemoOpen && (
        <DemoControlPanel
          currentDemoMode={engine.getDemoMode()}
          onSelectDemoMode={handleSelectDemoMode}
          onClose={() => setIsDemoOpen(false)}
          onTestVoice={(text) => {
            initAudioContext();
            speakVoiceAlert(text, 0);
          }}
        />
      )}

      {/* Compact & Clean Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/95 py-3 px-4 safe-pb text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] text-slate-300">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-400 shrink-0"></span>
            <span>Bản quyền thuộc về <strong className="text-amber-300 font-bold">PTDTBT THCS Thu Cúc</strong></span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-amber-400 font-medium">Sáng tạo Trẻ toàn quốc (Lĩnh vực AI)</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 font-mono">
            DriveGuard AI &copy; 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
