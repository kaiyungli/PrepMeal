'use client';

import { useEffect } from 'react';
import { isAdSenseEnabled, ADS_CONFIG } from '@/constants/ads';

/**
 * Global AdSense script injection
 * Injected once in _app.js wrapper
 */

export default function AdSenseLoader({ children }: { children?: React.ReactNode }) {
  useEffect(() => {
    if (!isAdSenseEnabled()) return;
    
    const pubId = ADS_CONFIG.pubId;
    if (!pubId) return;
    
    // Guard: Only inject script once
    if (document.getElementById('adsense-script')) return;
    
    // Load correct AdSense script
    const script = document.createElement('script');
    script.id = 'adsense-script';
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}`;
    script.crossOrigin = 'anonymous';
    
    document.head.appendChild(script);
  }, []);

  return <>{children}</>;
}
