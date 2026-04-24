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

// Measure real browser page load metrics
// Call in useEffect on homepage with empty deps
export function measurePageLoadMetrics(): () => void {
  if (typeof window === 'undefined' || !shouldLog) return () => {};

  const traceId = createPerfTraceId('page_load');

  // 1. Navigation timings (synchronous)
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navEntry) {
    // TTFB
    const ttfb = (navEntry.responseStart || 0) - (navEntry.requestStart || 0);
    if (ttfb > 0) {
      perfLog({ traceId, event: 'page_load', stage: 'nav_ttfb', label: 'TTFB', duration: ttfb });
    }
    // DOMContentLoaded
    const dcl = navEntry.domContentLoadedEventEnd || 0;
    if (dcl > 0) {
      perfLog({ traceId, event: 'page_load', stage: 'dom_content_loaded', label: 'DCL', duration: dcl });
    }
    // Window load
    const load = navEntry.loadEventEnd || 0;
    if (load > 0) {
      perfLog({ traceId, event: 'page_load', stage: 'window_load', label: 'load', duration: load });
    }
  }

  // 2. Paint metrics (FCP) via PerformanceObserver
  let fcpLogged = false;
  const paintObserver = new PerformanceObserver((list) => {
    if (fcpLogged) return;
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
        fcpLogged = true;
        perfLog({ traceId, event: 'page_load', stage: 'paint_fcp', label: 'FCP', duration: entry.startTime });
      }
    }
  });

  try {
    paintObserver.observe({ type: 'paint', buffered: true });
  } catch (_) {}

  // 3. LCP via PerformanceObserver (log once, debounced)
  let lcpLogged = false;
  const lcpObserver = new PerformanceObserver((list) => {
    if (lcpLogged) return;
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1] as LargestContentfulPaint | undefined;
    if (lastEntry) {
      lcpLogged = true;
      perfLog({ traceId, event: 'page_load', stage: 'paint_lcp', label: 'LCP', duration: lastEntry.startTime });
    }
  });

  try {
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}

  // Cleanup
  return () => {
    paintObserver.disconnect();
    lcpObserver.disconnect();
  };
}

// Legacy alias for backward compatibility
export const perfStart = perfNow;
export const perfEnd = (label: string, start: number) => perfMeasure(label, start);
