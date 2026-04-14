// Performance measurement utility
// Usage: import { perfNow, perfMeasure, perfStage, createPerfTraceId, perfLog } from '@/utils/perf';

// Server-side: use ENABLE_PERF env var
// Client-side: use NEXT_PUBLIC_ENABLE_PERF env var
const isServer = typeof window === 'undefined';
const shouldLog = isServer 
  ? process.env.ENABLE_PERF === 'true'
  : process.env.NEXT_PUBLIC_ENABLE_PERF === 'true';

const PERF_PREFIX = '[perf]';

// Get current timestamp in milliseconds
export function perfNow(): number {
  return performance.now();
}

// Create a client-side trace ID
export function createPerfTraceId(prefix = 'trace'): string {
  const now = Date.now();
  const random = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${now}_${random}`;
}

// Forward client perf to server API
function forwardToServer(payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const duration = payload.duration_ms as number;
  if (!duration || duration < 5) return;
  
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon('/api/perf-log', blob);
  } else {
    fetch('/api/perf-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  }
}

// Structured perf log
interface PerfLogParams {
  traceId?: string | null;
  event?: string | null;
  stage?: string;
  label?: string;
  start?: number;
  end?: number;
  duration?: number;
  meta?: Record<string, unknown> | null;
}

export function perfLog(params: PerfLogParams): void {
  const { traceId = null, event = null, stage, label, start, end, duration, meta = null } = params;
  if (!shouldLog || !stage || !label) return;
  
  // Calculate duration
  let durationMs: number;
  if (duration !== undefined) {
    durationMs = duration;
  } else if (start !== undefined && end !== undefined) {
    durationMs = end - start;
  } else if (start !== undefined) {
    durationMs = performance.now() - start;
  } else {
    return;
  }
  
  const payload = {
    type: 'perf',
    traceId,
    event,
    stage,
    label,
    duration_ms: Math.round(durationMs * 100) / 100,
    path: typeof window !== 'undefined' ? window.location.pathname : null,
    ts: new Date().toISOString(),
    meta
  };
  
  const logLine = JSON.stringify(payload);
  console.log(PERF_PREFIX + ' ' + logLine);
  forwardToServer(payload);
}

// Simple labeled measurement - now uses perfLog internally
export function perfMeasure(label: string, start: number): void {
  if (!shouldLog) return;
  perfLog({ stage: label, label, start });
}

// Conditional measurement - only logs if duration exceeds threshold (default 10ms)
export function perfMeasureIfSlow(label: string, start: number, thresholdMs = 10): void {
  if (!shouldLog) return;
  const duration = performance.now() - start;
  if (duration > thresholdMs) {
    perfMeasure(label, start);
  }
}

// Stage timing - now uses perfLog internally
export function perfStage(name: string, start: number, end: number): void {
  if (!shouldLog) return;
  perfLog({ stage: name, label: name, start, end });
}

// Legacy alias for backward compatibility
export const perfStart = perfNow;
export const perfEnd = (label: string, start: number) => perfMeasure(label, start);
