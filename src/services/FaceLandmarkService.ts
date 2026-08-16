/**
 * MediaPipe Face Landmarker Service
 * Loads Wasm binaries and task models, manages video inference loop
 */

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { CONFIG } from '../config/constants';
import { FaceLandmarksSmoother } from '../engine/OneEuroFilter';

export interface Point3D {
  x: number;
  y: number;
  z?: number;
}

export interface FaceBoundingBox {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export class FaceLandmarkService {
  private landmarker: FaceLandmarker | null = null;
  private isLoading: boolean = false;
  private isReady: boolean = false;
  private errorMessage: string | null = null;
  private smoother = new FaceLandmarksSmoother(
    CONFIG.FILTER.ONE_EURO_MIN_CUTOFF,
    CONFIG.FILTER.ONE_EURO_BETA,
    CONFIG.FILTER.ONE_EURO_D_CUTOFF
  );

  public async initialize(): Promise<boolean> {
    if (this.isReady) return true;
    if (this.isLoading) return false;

    this.isLoading = true;
    this.errorMessage = null;

    try {
      const vision = await FilesetResolver.forVisionTasks(CONFIG.MEDIAPIPE_WASMS);
      
      this.landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: CONFIG.MEDIAPIPE_MODEL_URL,
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: false
      });

      this.isReady = true;
      this.isLoading = false;
      return true;
    } catch (err) {
      console.warn('GPU acceleration fallback to CPU for MediaPipe FaceLandmarker:', err);
      // Try fallback with CPU delegate if GPU fails
      try {
        const vision = await FilesetResolver.forVisionTasks(CONFIG.MEDIAPIPE_WASMS);
        this.landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: CONFIG.MEDIAPIPE_MODEL_URL,
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: false
        });

        this.isReady = true;
        this.isLoading = false;
        return true;
      } catch (cpuErr: unknown) {
        const errStr = cpuErr instanceof Error ? cpuErr.message : String(cpuErr);
        console.error('Failed to initialize MediaPipe FaceLandmarker:', cpuErr);
        this.errorMessage = `Không thể tải mô hình nhận diện khuôn mặt: ${errStr}`;
        this.isLoading = false;
        return false;
      }
    }
  }

  public detectForVideo(video: HTMLVideoElement, timestampMs: number, applySmoothing: boolean = true): Point3D[] | null {
    if (!this.isReady || !this.landmarker || video.readyState < 2) {
      return null;
    }

    try {
      const results = this.landmarker.detectForVideo(video, timestampMs);
      if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
        const rawLandmarks = results.faceLandmarks[0] as Point3D[];
        if (applySmoothing) {
          return this.smoother.smooth(rawLandmarks, timestampMs);
        }
        return rawLandmarks;
      }
    } catch (err) {
      console.warn('Error during FaceLandmarker detectForVideo:', err);
    }
    return null;
  }

  public getFaceBoundingBox(landmarks: Point3D[] | null, marginPercent: number = 0.2): FaceBoundingBox | null {
    if (!landmarks || landmarks.length < 10) return null;

    let xMin = 1.0;
    let yMin = 1.0;
    let xMax = 0.0;
    let yMax = 0.0;

    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }

    const rawWidth = xMax - xMin;
    const rawHeight = yMax - yMin;

    const marginX = rawWidth * marginPercent;
    const marginY = rawHeight * marginPercent;

    const boundedXMin = Math.max(0, xMin - marginX);
    const boundedYMin = Math.max(0, yMin - marginY);
    const boundedXMax = Math.min(1.0, xMax + marginX);
    const boundedYMax = Math.min(1.0, yMax + marginY);

    return {
      xMin: boundedXMin,
      yMin: boundedYMin,
      xMax: boundedXMax,
      yMax: boundedYMax,
      width: boundedXMax - boundedXMin,
      height: boundedYMax - boundedYMin,
      centerX: (boundedXMin + boundedXMax) / 2,
      centerY: (boundedYMin + boundedYMax) / 2
    };
  }

  public getIsReady(): boolean {
    return this.isReady;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  public resetSmoothing(): void {
    this.smoother.reset();
  }

  public close(): void {
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch (e) {
        console.warn('Error closing landmarker:', e);
      }
      this.landmarker = null;
    }
    this.smoother.reset();
    this.isReady = false;
    this.isLoading = false;
  }
}

export const faceLandmarkService = new FaceLandmarkService();
