'use client';

/**
 * Homepage performance logging hook
 * Handles first load and data ready timing/measurements
 */

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/router';

// Lazy-loaded perf utils to avoid init order issues
const getPerfUtils = () => {
  try {
    return require('@/utils/perf');
  } catch {
    return { perfNow: () => Date.now(), perfLog: () => {}, measurePageLoadMetrics: () => {} };
  }
};

export function useHomePerfLogging() {
  // First load start timestamp ref - created once on component mount
  const firstLoadStartRef = useRef<number>(0);
  
  // Track if data ready has been logged
  const homeDataReadyLogged = useRef(false);

  // Log initial page ready (run once on mount)
  useEffect(() => {
    // Initialize start time
    if (firstLoadStartRef.current === 0) {
      firstLoadStartRef.current = Date.now();
    }
  }, []);

  // Function to mark data ready - call this when recipes load completes
  const markDataReady = () => {
    if (homeDataReadyLogged.current) return;
    
    homeDataReadyLogged.current = true;
    
    try {
      const { perfLog } = getPerfUtils();
      const start = firstLoadStartRef.current;
      const end = Date.now();
      
      perfLog({
        event: 'page_load',
        stage: 'data_ready',
        label: 'home.first_load.data_ready',
        start,
        end,
        duration: end - start,
      });
    } catch {
      // Silent fail for perf logging
    }
  };

  return {
    markDataReady,
  };
}

export default useHomePerfLogging;
