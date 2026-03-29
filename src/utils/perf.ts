// Performance measurement utility
// Usage: import { perfNow, perfMeasure, perfStage } from '@/utils/perf';

// Server-side: use ENABLE_PERF env var
// Client-side: use NEXT_PUBLIC_ENABLE_PERF env var
const isServer = typeof window === 'undefined';
const shouldLog = isServer 
  ? process.env.ENABLE_PERF === 'true'
  : process.env.NEXT_PUBLIC_ENABLE_PERF === 'true';

// Get current timestamp in milliseconds
export function perfNow(): number {
  return performance.now();
}

// Forward client perf to server API
function forwardToServer(label: string, duration: number): void {
  if (typeof window === 'undefined') return;
  
  // Only forward if duration >= 5ms to reduce noise
  if (duration < 5) return;
  
  const payload = {
    label,
    duration_ms: Math.round(duration * 100) / 100,
    ts: new Date().toISOString(),
    path: window.location.pathname
  };
  
  // Use sendBeacon if available, fallback to fetch with keepalive
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon('/api/perf-log', blob);
  } else {
    fetch('/api/perf-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {}); // Silent fail
  }
}

// Simple labeled measurement - pass start timestamp from perfNow()
export function perfMeasure(label: string, start: number): void {
  if (!shouldLog) return;
  const duration = performance.now() - start;
  
  // Server: console.log directly
  if (isServer) {
    console.log(`[perf] ${label} total: ${duration.toFixed(2)}ms`);
  } else {
    // Client: console.log + forward to server
    console.log(`[perf] ${label} total: ${duration.toFixed(2)}ms`);
    forwardToServer(label, duration);
  }
}

// Conditional measurement - only logs if duration exceeds threshold (default 10ms)
export function perfMeasureIfSlow(label: string, start: number, thresholdMs = 10): void {
  if (!shouldLog) return;
  const duration = performance.now() - start;
  if (duration > thresholdMs) {
    perfMeasure(label, start);
  }
}

// Stage timing - aggregate multiple measurements into single log
export function perfStage(name: string, start: number, end: number): void {
  if (!shouldLog) return;
  const duration = end - start;
  
  if (isServer) {
    console.log(`[perf] ${name}: ${duration.toFixed(2)}ms`);
  } else {
    console.log(`[perf] ${name}: ${duration.toFixed(2)}ms`);
    forwardToServer(name, duration);
  }
}

// Legacy alias for backward compatibility
export const perfStart = perfNow;
export const perfEnd = (label: string, start: number) => perfMeasure(label, start);