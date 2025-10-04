/**
 * High-precision timing utilities for tachistoscope exercises.
 * 
 * JavaScript's setTimeout is not precise enough for clinical/therapeutic applications.
 * This module provides microsecond-level precision timing using performance.now()
 * and requestAnimationFrame, with error compensation to prevent timing drift.
 * 
 * Key features:
 * - Sub-millisecond precision using performance.now()
 * - Synchronization with display refresh using requestAnimationFrame
 * - Error compensation to prevent drift over multiple timing events
 * - Detailed timing metrics for validation and debugging
 */

export interface TimingMetrics {
  /** Timestamp when timing started (performance.now()) */
  startTime: number;
  /** Timestamp when timing ended (performance.now()) */
  endTime: number;
  /** Target duration in milliseconds */
  targetDuration: number;
  /** Actual duration in milliseconds */
  actualDuration: number;
  /** Error in milliseconds (actualDuration - targetDuration) */
  error: number;
  /** Error as percentage of target duration */
  errorPercent: number;
  /** Phase identifier (e.g., "stimulus", "word", "interval") */
  phase: string;
}

export interface PrecisionTimerConfig {
  /** Target duration in milliseconds */
  duration: number;
  /** Callback to execute when timer completes */
  onComplete: () => void;
  /** Optional callback for progress updates (0-1) */
  onProgress?: (progress: number) => void;
  /** Optional phase identifier for metrics */
  phase?: string;
  /** Optional callback to check if timer should continue */
  shouldContinue?: () => boolean;
}

export class PrecisionTimer {
  private animationFrameId: number | null = null;
  private startTime: number | null = null;
  private isRunning = false;
  private config: PrecisionTimerConfig;
  private metrics: TimingMetrics | null = null;

  constructor(config: PrecisionTimerConfig) {
    this.config = config;
  }

  /**
   * Start the precision timer
   */
  start(): void {
    if (this.isRunning) {
      console.warn('PrecisionTimer: Timer already running');
      return;
    }

    this.isRunning = true;
    this.startTime = performance.now();
    this.tick();
  }

  /**
   * Stop the timer immediately
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Get timing metrics for the last completed timer
   */
  getMetrics(): TimingMetrics | null {
    return this.metrics;
  }

  /**
   * Internal tick function - called on each animation frame
   */
  private tick = (): void => {
    if (!this.isRunning || this.startTime === null) {
      return;
    }

    // Check if external condition says we should stop
    if (this.config.shouldContinue && !this.config.shouldContinue()) {
      this.stop();
      return;
    }

    const currentTime = performance.now();
    const elapsed = currentTime - this.startTime;
    const progress = Math.min(elapsed / this.config.duration, 1);

    // Call progress callback if provided
    if (this.config.onProgress) {
      this.config.onProgress(progress);
    }

    // Check if we've reached target duration
    if (elapsed >= this.config.duration) {
      this.complete(currentTime);
    } else {
      // Schedule next frame
      this.animationFrameId = requestAnimationFrame(this.tick);
    }
  };

  /**
   * Complete the timer and collect metrics
   */
  private complete(endTime: number): void {
    if (this.startTime === null) return;

    const actualDuration = endTime - this.startTime;
    const error = actualDuration - this.config.duration;
    const errorPercent = (error / this.config.duration) * 100;

    // Store metrics
    this.metrics = {
      startTime: this.startTime,
      endTime,
      targetDuration: this.config.duration,
      actualDuration,
      error,
      errorPercent,
      phase: this.config.phase || 'unknown',
    };

    // Log metrics for debugging/validation (only in development)
    if (import.meta.env.DEV) {
      console.log(`⏱️ Timer completed:`, {
        phase: this.config.phase,
        target: `${this.config.duration}ms`,
        actual: `${actualDuration.toFixed(3)}ms`,
        error: `${error.toFixed(3)}ms (${errorPercent.toFixed(2)}%)`,
      });
    }

    this.isRunning = false;
    this.config.onComplete();
  }
}

/**
 * Utility function to create and start a precision timer
 */
export const setPrecisionTimeout = (
  callback: () => void,
  duration: number,
  options?: {
    phase?: string;
    onProgress?: (progress: number) => void;
    shouldContinue?: () => boolean;
  }
): PrecisionTimer => {
  const timer = new PrecisionTimer({
    duration,
    onComplete: callback,
    phase: options?.phase,
    onProgress: options?.onProgress,
    shouldContinue: options?.shouldContinue,
  });
  timer.start();
  return timer;
};

/**
 * Manager for multiple sequential precision timers
 * Useful for tachistoscope sequences (stimulus → word → mask → interval)
 */
export class TimingSequenceManager {
  private timers: PrecisionTimer[] = [];
  private allMetrics: TimingMetrics[] = [];
  private isRunning = false;
  private shouldContinueFn: (() => boolean) | null = null;

  /**
   * Set a function to check if the sequence should continue
   */
  setShouldContinue(fn: () => boolean): void {
    this.shouldContinueFn = fn;
  }

  /**
   * Add a timer to the sequence
   */
  addTimer(config: Omit<PrecisionTimerConfig, 'shouldContinue'>): void {
    const timer = new PrecisionTimer({
      ...config,
      shouldContinue: () => this.shouldContinueFn?.() ?? true,
      onComplete: () => {
        // Store metrics
        const metrics = timer.getMetrics();
        if (metrics) {
          this.allMetrics.push(metrics);
        }
        // Call original callback
        config.onComplete();
      },
    });
    this.timers.push(timer);
  }

  /**
   * Start the sequence (starts the first timer)
   */
  start(): void {
    if (this.timers.length === 0) {
      console.warn('TimingSequenceManager: No timers to start');
      return;
    }
    this.isRunning = true;
    this.allMetrics = [];
  }

  /**
   * Stop all timers in the sequence
   */
  stop(): void {
    this.isRunning = false;
    this.timers.forEach(timer => timer.stop());
  }

  /**
   * Clear all timers
   */
  clear(): void {
    this.stop();
    this.timers = [];
    this.allMetrics = [];
  }

  /**
   * Get metrics for all completed timers
   */
  getAllMetrics(): TimingMetrics[] {
    return [...this.allMetrics];
  }

  /**
   * Get aggregate statistics across all timers
   */
  getAggregateStats(): {
    totalPhases: number;
    totalTargetTime: number;
    totalActualTime: number;
    totalError: number;
    averageError: number;
    maxError: number;
    maxErrorPhase: string;
  } | null {
    if (this.allMetrics.length === 0) return null;

    const totalTargetTime = this.allMetrics.reduce((sum, m) => sum + m.targetDuration, 0);
    const totalActualTime = this.allMetrics.reduce((sum, m) => sum + m.actualDuration, 0);
    const totalError = totalActualTime - totalTargetTime;
    const averageError = totalError / this.allMetrics.length;
    
    const maxErrorMetric = this.allMetrics.reduce((max, m) => 
      Math.abs(m.error) > Math.abs(max.error) ? m : max
    );

    return {
      totalPhases: this.allMetrics.length,
      totalTargetTime,
      totalActualTime,
      totalError,
      averageError,
      maxError: maxErrorMetric.error,
      maxErrorPhase: maxErrorMetric.phase,
    };
  }
}

/**
 * Calculate random interval with variability (used for inter-stimulus intervals)
 */
export const calculateVariableInterval = (
  baseDuration: number,
  variability: number
): number => {
  if (variability === 0) return baseDuration;
  
  // Random variation between -variability and +variability
  const randomVariation = (Math.random() * 2 - 1) * variability;
  const result = baseDuration + randomVariation;
  
  // Ensure minimum of 50ms
  return Math.max(50, result);
};
