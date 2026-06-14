export interface PerformanceMetrics {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsed?: number;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private enabled = process.env.NODE_ENV !== 'production';

  start(name: string): void {
    if (!this.enabled) return;

    const metric: PerformanceMetrics = {
      name,
      startTime: performance.now(),
    };

    this.metrics.set(name, metric);
  }

  end(name: string): number | undefined {
    if (!this.enabled) return;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric ${name} not started`);
      return;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    if (global.gc) {
      global.gc();
      const used = process.memoryUsage();
      metric.memoryUsed = used.heapUsed / 1024 / 1024;
    }

    this.logMetric(metric);
    return metric.duration;
  }

  measure<T>(name: string, fn: () => T): T {
    this.start(name);
    try {
      return fn();
    } finally {
      this.end(name);
    }
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      return await fn();
    } finally {
      this.end(name);
    }
  }

  private logMetric(metric: PerformanceMetrics): void {
    if (!metric.duration) return;

    const memory = metric.memoryUsed ? ` (${metric.memoryUsed.toFixed(2)}MB)` : '';
    const threshold = 1000;
    const isSlower = metric.duration > threshold;
    const warning = isSlower ? ' ⚠️ ' : '';

    console.info(`⏱️  ${metric.name}: ${metric.duration.toFixed(2)}ms${memory}${warning}`);
  }

  getSummary(): Record<string, number> {
    const summary: Record<string, number> = {};

    for (const [name, metric] of this.metrics) {
      if (metric.duration) {
        summary[name] = metric.duration;
      }
    }

    return summary;
  }

  clear(): void {
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();
