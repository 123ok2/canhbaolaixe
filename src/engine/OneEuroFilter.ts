/**
 * 1€ Filter (One Euro Filter) Implementation
 * Real-time adaptive low-pass filter for noisy signals with jitter reduction
 * and zero lag at high velocities. Ideal for mobile facial landmark tracking.
 * 
 * Reference: Casiez, G., Roussel, N. and Vogel, F. (2012)
 * "1€ Filter: A Simple Speed-based Low-pass Filter for Noisy Input in Human-Computer Interaction"
 */

export class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  public filter(value: number, alpha: number): number {
    if (this.y === null) {
      this.s = value;
      this.y = value;
      return value;
    }
    this.s = alpha * value + (1.0 - alpha) * (this.s ?? value);
    this.y = this.s;
    return this.y;
  }

  public lastValue(): number | null {
    return this.y;
  }

  public reset(): void {
    this.y = null;
    this.s = null;
  }
}

export class OneEuroFilter {
  private minCutoff: number; // Minimum cutoff frequency (Hz) - higher means less lag, lower means less jitter
  private beta: number;      // Speed coefficient - adjusts cutoff frequency based on velocity
  private dCutoff: number;   // Cutoff frequency for derivative calculation (Hz)

  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private lastTime: number | null = null;

  constructor(minCutoff: number = 1.2, beta: number = 0.05, dCutoff: number = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  public filter(value: number, timestampMs: number): number {
    if (this.lastTime === null || timestampMs <= this.lastTime) {
      this.lastTime = timestampMs;
      return this.xFilter.filter(value, 1.0);
    }

    const dt = Math.max((timestampMs - this.lastTime) / 1000.0, 0.001);
    this.lastTime = timestampMs;

    // Estimate the rate of change (derivative) of the signal
    const prevX = this.xFilter.lastValue() ?? value;
    const dx = (value - prevX) / dt;
    const edx = this.dxFilter.filter(dx, this.alpha(this.dCutoff, dt));

    // Dynamic cutoff frequency calculation
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(value, this.alpha(cutoff, dt));
  }

  public reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}

export interface Point3D {
  x: number;
  y: number;
  z?: number;
}

/**
 * 3D Landmark array smoother using 1€ Filter for every individual landmark
 */
export class FaceLandmarksSmoother {
  private xFilters: OneEuroFilter[] = [];
  private yFilters: OneEuroFilter[] = [];
  private zFilters: OneEuroFilter[] = [];

  constructor(
    private minCutoff: number = 1.0,
    private beta: number = 0.04,
    private dCutoff: number = 1.0
  ) {}

  public smooth(landmarks: Point3D[] | null, timestampMs: number): Point3D[] | null {
    if (!landmarks || landmarks.length === 0) {
      return null;
    }

    // Ensure filter arrays match landmark count
    while (this.xFilters.length < landmarks.length) {
      this.xFilters.push(new OneEuroFilter(this.minCutoff, this.beta, this.dCutoff));
      this.yFilters.push(new OneEuroFilter(this.minCutoff, this.beta, this.dCutoff));
      this.zFilters.push(new OneEuroFilter(this.minCutoff, this.beta, this.dCutoff));
    }

    const smoothed: Point3D[] = new Array(landmarks.length);

    for (let i = 0; i < landmarks.length; i++) {
      const pt = landmarks[i];
      const sx = this.xFilters[i].filter(pt.x, timestampMs);
      const sy = this.yFilters[i].filter(pt.y, timestampMs);
      const sz = pt.z !== undefined ? this.zFilters[i].filter(pt.z, timestampMs) : undefined;

      smoothed[i] = { x: sx, y: sy, z: sz };
    }

    return smoothed;
  }

  public reset(): void {
    this.xFilters.forEach(f => f.reset());
    this.yFilters.forEach(f => f.reset());
    this.zFilters.forEach(f => f.reset());
  }
}
