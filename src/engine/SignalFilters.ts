/**
 * Signal Processing Utilities: Kalman Filter, Exponential Moving Average (EMA),
 * Moving Median, and Camera Environment / Lighting / Angle Diagnostics.
 */

export class ExponentialMovingAverage {
  private alpha: number;
  private value: number | null = null;

  constructor(alpha: number = 0.35) {
    this.alpha = Math.max(0.01, Math.min(1.0, alpha));
  }

  public update(val: number): number {
    if (this.value === null) {
      this.value = val;
      return val;
    }
    this.value = this.alpha * val + (1.0 - this.alpha) * this.value;
    return this.value;
  }

  public get(): number | null {
    return this.value;
  }

  public reset(): void {
    this.value = null;
  }
}

/**
 * 1D Kalman Filter for smooth sensor metric tracking (EAR / MAR / Head Angles)
 */
export class KalmanFilter1D {
  private q: number; // Process noise covariance
  private r: number; // Measurement noise covariance
  private x: number; // Estimated state
  private p: number; // Estimation error covariance
  private k: number; // Kalman gain
  private initialized: boolean = false;

  constructor(processNoise: number = 0.008, measurementNoise: number = 0.05, initialEstimationError: number = 1.0) {
    this.q = processNoise;
    this.r = measurementNoise;
    this.p = initialEstimationError;
    this.x = 0;
    this.k = 0;
  }

  public update(measurement: number): number {
    if (!this.initialized) {
      this.x = measurement;
      this.initialized = true;
      return this.x;
    }

    // Prediction update
    this.p = this.p + this.q;

    // Measurement update
    this.k = this.p / (this.p + this.r);
    this.x = this.x + this.k * (measurement - this.x);
    this.p = (1 - this.k) * this.p;

    return this.x;
  }

  public get(): number {
    return this.x;
  }

  public reset(): void {
    this.initialized = false;
    this.p = 1.0;
    this.x = 0;
    this.k = 0;
  }
}

/**
 * Mobile Environment & Hardware Diagnostics
 */
export interface EnvironmentDiagnostics {
  lightingState: 'GOOD' | 'LOW_LIGHT' | 'OVEREXPOSED';
  lightingLevel: number; // 0 - 255
  angleStatus: 'OPTIMAL' | 'TILTED_HIGH' | 'TILTED_LOW' | 'TILTED_SIDE';
  angleMessage: string | null;
  lightingMessage: string | null;
  fps: number;
}

export class EnvironmentAnalyzer {
  private frameCount: number = 0;
  private lastFpsCalcTimeMs: number = Date.now();
  private currentFps: number = 30;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  public analyze(
    video: HTMLVideoElement | null,
    pitch: number,
    yaw: number,
    roll: number,
    faceDetected: boolean
  ): EnvironmentDiagnostics {
    const now = Date.now();
    this.frameCount++;

    if (now - this.lastFpsCalcTimeMs >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsCalcTimeMs));
      this.frameCount = 0;
      this.lastFpsCalcTimeMs = now;
    }

    let lightingLevel = 128;
    let lightingState: 'GOOD' | 'LOW_LIGHT' | 'OVEREXPOSED' = 'GOOD';
    let lightingMessage: string | null = null;

    // Lightweight luminance sampling from video element (every ~10 frames or low-res)
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      try {
        if (!this.canvas) {
          this.canvas = document.createElement('canvas');
          this.canvas.width = 32;
          this.canvas.height = 24;
          this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        }

        if (this.ctx) {
          this.ctx.drawImage(video, 0, 0, 32, 24);
          const imgData = this.ctx.getImageData(0, 0, 32, 24);
          const data = imgData.data;
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) {
            // Standard perceived brightness formula: 0.299*R + 0.587*G + 0.114*B
            sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          }
          lightingLevel = Math.round(sum / (data.length / 4));

          if (lightingLevel < 40) {
            lightingState = 'LOW_LIGHT';
            lightingMessage = 'Ánh sáng yếu: Bật đèn cabin hoặc hỗ trợ đèn hồng ngoại';
          } else if (lightingLevel > 225) {
            lightingState = 'OVEREXPOSED';
            lightingMessage = 'Chói sáng: Điều chỉnh góc camera tránh ánh nắng trực tiếp';
          }
        }
      } catch {
        // Ignore canvas read errors if tainted
      }
    }

    // Camera Angle Check: Angle relative to driver straight axis > 30 degrees causes geometric distortion
    let angleStatus: 'OPTIMAL' | 'TILTED_HIGH' | 'TILTED_LOW' | 'TILTED_SIDE' = 'OPTIMAL';
    let angleMessage: string | null = null;

    if (faceDetected) {
      if (pitch < -30) {
        angleStatus = 'TILTED_LOW';
        angleMessage = 'Điện thoại đặt quá thấp (cúi >30°). Hãy gắn ngang tầm mắt';
      } else if (pitch > 28) {
        angleStatus = 'TILTED_HIGH';
        angleMessage = 'Điện thoại đặt quá cao (ngửa >28°). Hãy hạ thấp giá đỡ';
      } else if (Math.abs(yaw) > 32) {
        angleStatus = 'TILTED_SIDE';
        angleMessage = 'Góc quay lệch sang một bên (>30°). Đặt điện thoại trước mặt';
      }
    }

    return {
      lightingState,
      lightingLevel,
      angleStatus,
      angleMessage,
      lightingMessage,
      fps: this.currentFps
    };
  }
}
