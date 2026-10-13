// Only speculative work uses this guard. Explicit navigation/load/retry remains available.
type ConnectionHints = { saveData?: boolean; effectiveType?: string };

export function canStartSpeculativeFetch(): boolean {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return false;
  if (navigator.onLine === false || document.visibilityState === 'hidden') return false;
  const connection = (navigator as Navigator & { connection?: ConnectionHints }).connection;
  return !connection?.saveData && connection?.effectiveType !== 'slow-2g' && connection?.effectiveType !== '2g';
}
