/**
 * MediaPipe Face Landmarker Service
 * Loads Wasm binaries and task models, manages video inference loop
 */

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { CONFIG } from '../config/constants';

interface Point3D {
  x: number;
  y: number;
  z?: number;
}

export class FaceLandmarkService {
  private landmarker: FaceLandmarker | null = null;
  private isLoading: boolean = false;
  private isReady: boolean = false;
  private errorMessage: string | null = null;

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

  public detectForVideo(video: HTMLVideoElement, timestampMs: number): Point3D[] | null {
    if (!this.isReady || !this.landmarker || video.readyState < 2) {
      return null;
    }

    try {
      const results = this.landmarker.detectForVideo(video, timestampMs);
      if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
        return results.faceLandmarks[0] as Point3D[];
      }
    } catch (err) {
      console.warn('Error during FaceLandmarker detectForVideo:', err);
    }
    return null;
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

  public close(): void {
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch (e) {
        console.warn('Error closing landmarker:', e);
      }
      this.landmarker = null;
    }
    this.isReady = false;
    this.isLoading = false;
  }
}

export const faceLandmarkService = new FaceLandmarkService();
