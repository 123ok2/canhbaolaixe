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
  SessionStats,
} from './types';

// Instantiate core engine singleton for app lifetime
const engine = new DrowsinessEngine();

export default function App() {
  const { videoRef, cameraState, startCamera } = useCamera();
  const {
    initAudioContext,
    playLevel1Alert,
    playLevel2Alert,
    playLevel3Alert,
    stopActiveAlert,
    isMuted,
    toggleMute
  } = useAudioAlerts();

  // Engine state React state variables
  const [metrics, setMetrics] = useState<DrowsinessMetrics>({
    score: 0,
    state: DrowsinessState.ALERT,
    eyeMetrics: { leftEar: 0.3, rightEar: 0.3, averageEar: 0.3, isClosed: false, closureDurationMs: 0, blinkCount: 0 },
    yawnMetrics: { mar: 0.2, isYawning: false, yawnDurationMs: 0, yawnCount: 0 },
    headPose: { pitch: 0, yaw: 0, roll: 0, isHeadDropped: false, headDropDurationMs: 0, headDropCount: 0 },
    calibration: { isCalibrated: false, baselineEar: 0.3, closedEarThreshold: 0.2, baselineMar: 0.2, openMarThreshold: 0.55, samplesCount: 0 },
    isEnhancedMonitoring: false
  });

  const [landmarks, setLandmarks] = useState<any[] | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats>(engine.getSessionManager().getStats());

  // Modals & Panels state
  const [isDemoOpen, setIsDemoOpen] = useState<boolean>(false);
  const [isFaceLandmarkerLoading, setIsFaceLandmarkerLoading] = useState<boolean>(true);

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

        if (currentLandmarks || demoMode !== 'OFF') {
          setLandmarks(currentLandmarks);

          const result = engine.processFrame(currentLandmarks, now);
          setMetrics(result.metrics);

          // Update session stats
          const newStats = engine.getSessionManager().getStats();
          setSessionStats(newStats);

          // Alert triggers on state change or level 3 danger repeat
          if (result.stateChanged) {
            initAudioContext();

            if (result.metrics.state === DrowsinessState.TIRED) {
              playLevel1Alert();
              engine.getSessionManager().recordAlertLevel(1);
            } else if (result.metrics.state === DrowsinessState.WARNING) {
              playLevel2Alert();
              engine.getSessionManager().recordAlertLevel(2);
            } else if (result.metrics.state === DrowsinessState.DANGER) {
              playLevel3Alert();
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
      />

      {/* Privacy & Safety Disclaimer Banner */}
      <PrivacyHeader />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Upper Grid: Camera Feed + Drowsiness Gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Camera Feed View (Takes 2 Columns on Large Screens) */}
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
          calibration={metrics.calibration}
          onBeginCalibration={() => engine.beginCalibrationSampling()}
          onSkip={() => engine.skipCalibration()}
        />
      )}

      {/* Drowsiness Alert Modal (Level 1, Level 2, Level 3) with "TÔI ĐÃ TỈNH" */}
      <AlertModal
        state={metrics.state}
        score={metrics.score}
        onConfirmAwake={handleConfirmAwake}
        isMuted={isMuted}
      />

      {/* Demo Simulation Control Panel Modal */}
      {isDemoOpen && (
        <DemoControlPanel
          currentDemoMode={engine.getDemoMode()}
          onSelectDemoMode={handleSelectDemoMode}
          onClose={() => setIsDemoOpen(false)}
        />
      )}

      {/* Compact & Clean Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-3.5 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[12px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Bản quyền thuộc về <strong className="text-amber-300 font-bold">PTDTBT THCS Thu Cúc</strong></span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-amber-400 font-medium">Sáng tạo Trẻ toàn quốc (Lĩnh vực AI)</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            DriveGuard AI &copy; 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
