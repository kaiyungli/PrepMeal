import '@/styles/globals.css';
import { useEffect } from 'react';

/**
 * Global client-side error logging
 * Captures all crashes, even before other logging runs
 */
function GlobalErrorLogger() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Capture uncaught errors
    window.onerror = function (message, source, lineno, colno, error) {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'window_onerror',
          message: String(message),
          source,
          lineno,
          colno,
          stack: error?.stack,
          timestamp: new Date().toISOString(),
        }),
      });
    };
    
    // Capture unhandled promise rejections
    window.onunhandledrejection = function (event) {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'unhandled_rejection',
          reason: String(event.reason),
          stack: event.reason?.stack,
          timestamp: new Date().toISOString(),
        }),
      });
    };
  }, []);
  
  return null;
}

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <GlobalErrorLogger />
      <Component {...pageProps} />
    </>
  );
}
