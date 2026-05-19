'use client';

/**
 * Homepage performance logging hook
 * Handles first load and data ready timing/measurements
 */

import { useRef, useEffect } from 'react';
import { perfNow, perfLog, measurePageLoadMetrics } from '@/utils/perf';

// No options - logging is automatic based on component lifecycle
export function useHomePerfLogging() {
  // First load start timestamp ref - created once on component mount
  const firstLoadStartRef = useRef(perfNow());
  
  // Track if data ready has been logged
  const homeDataReadyLogged = useRef(false);

  // Log initial page ready (run once on mount)
  useEffect(() => {
    const start = firstLoadStartRef.current;
    const end = perfNow();
    
    perfLog({
      event: 'page_load',
      stage: 'home_ready',
      label: 'home.first_load.ready',
      start,
      end,
    });

    // Measure real browser page load metrics (TTFB, FCP, LCP, DCL, load)
    return measurePageLoadMetrics();
  }, []);

  // Function to mark data ready - call this when recipes load completes
  const markDataReady = () => {
    if (homeDataReadyLogged.current) return;
    
    homeDataReadyLogged.current = true;
    
    const start = firstLoadStartRef.current;
    const end = perfNow();
    
    perfLog({
      event: 'page_load',
      stage: 'data_ready',
      label: 'home.first_load.data_ready',
      start,
      end,
      duration: end - start,
    });
  };

  return {
    markDataReady,
  };
}

export default useHomePerfLogging;
