// Performance measurement utility
// Usage: import { perfNow, perfMeasure, perfLog, measurePageLoadMetrics } from '@/utils/perf';

// Client-side: use NEXT_PUBLIC_ENABLE_PERF env var
const shouldLog = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ENABLE_PERF === 'true';

const PERF_PREFIX = '[perf]';

export function perfNow(): number {
  return performance.now();
}

export function createPerfTraceId(prefix = 'trace'): string {
  const now = Date.now();
  const random = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${now}_${random}`;
}

// Structured perf log - console only (no server forwarding)
export function perfLog(params: { traceId?: string | null; event?: string | null; stage?: string; label?: string; start?: number; end?: number; duration?: number; meta?: Record<string, unknown> | null }): void {
  const { stage, label, start, end, duration } = params;
  if (!shouldLog || !stage || !label) return;
  
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
    stage,
    label,
    duration_ms: Math.round(durationMs * 100) / 100,
  };
  
  console.log(PERF_PREFIX + ' ' + JSON.stringify(payload));
}

export function perfMeasure(label: string, start: number): void {
  if (!shouldLog) return;
  perfLog({ stage: label, label, start });
}

export function perfMeasureIfSlow(label: string, start: number, thresholdMs = 10): void {
  if (!shouldLog) return;
  const duration = performance.now() - start;
  if (duration > thresholdMs) {
    perfMeasure(label, start);
  }
}

export function perfStage(name: string, start: number, end: number): void {
  if (!shouldLog) return;
  perfLog({ stage: name, label: name, start, end });
}

// Measure page load metrics (FCP + LCP only)
export function measurePageLoadMetrics(): () => void {
  if (typeof window === 'undefined' || !shouldLog) return () => {};

  const traceId = createPerfTraceId('page_load');

  // FCP via PerformanceObserver
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

  // LCP via PerformanceObserver
  let lcpLogged = false;
  const lcpObserver = new PerformanceObserver((list) => {
    if (lcpLogged) return;
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1] as LargestContentfulPaint | undefined;
    if (lastEntry) {
      lcpLogged = true;
      const el = lastEntry.element;
      perfLog({ 
        traceId, 
        event: 'page_load', 
        stage: 'paint_lcp', 
        label: 'LCP', 
        duration: lastEntry.startTime,
        meta: {
          tagName: el?.tagName || null,
          className: el?.className?.slice(0, 100) || null,
          text: el?.textContent?.slice(0, 80) || null,
        }
      });
    }
  });

  try {
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}

  return () => {
    paintObserver.disconnect();
    lcpObserver.disconnect();
  };
}

export const perfStart = perfNow;
export const perfEnd = (label: string, start: number) => perfMeasure(label, start);