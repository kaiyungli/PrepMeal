// Performance measurement utility
// Usage: import { perfNow, perfMeasure, perfStart, perfEnd } from '@/utils/perf';

const ENABLE_PERF = process.env.NODE_ENV !== 'production';

// Get current timestamp in milliseconds
export function perfNow(): number {
  return performance.now();
}

// Simple labeled measurement - pass start timestamp from perfNow()
export function perfMeasure(label: string, start: number): void {
  if (!ENABLE_PERF) return;
  const duration = performance.now() - start;
  console.log(`[perf] ${label} total: ${duration.toFixed(2)}ms`);
}

// Start a measurement, returns start timestamp to pass to perfMeasure
export function perfStart(label: string): number {
  if (!ENABLE_PERF) return 0;
  return performance.now();
}

// End measurement and log - convenience wrapper
export function perfEnd(label: string, start: number): void {
  perfMeasure(label, start);
}

// Conditional measurement - only logs if duration exceeds threshold (default 10ms)
export function perfMeasureIfSlow(label: string, start: number, thresholdMs = 10): void {
  if (!ENABLE_PERF) return;
  const duration = performance.now() - start;
  if (duration > thresholdMs) {
    console.log(`[perf] ${label} total: ${duration.toFixed(2)}ms`);
  }
}

// Stage timing - aggregate multiple measurements into single log
export function perfStage(name: string, start: number, end: number): void {
  if (!ENABLE_PERF) return;
  const duration = end - start;
  console.log(`[perf] ${name}: ${duration.toFixed(2)}ms`);
}