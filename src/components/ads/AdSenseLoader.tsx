'use client';

import { useEffect } from 'react';
import { isAdSenseEnabled, ADS_CONFIG } from '@/constants/ads';

export default function AdSenseLoader({ children }: { children?: React.ReactNode }) {
  useEffect(() => {
    if (!isAdSenseEnabled()) return;
    
    const pubId = ADS_CONFIG.pubId;
    if (!pubId || pubId === '') return;
    
    if (document.getElementById('adsense-script')) return;
    
    const script = document.createElement('script');
    script.id = 'adsense-script';
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/show.js?ads=${pubId}`;
    script.crossOrigin = 'anonymous';
    
    document.head.appendChild(script);
    
    // gtag setup
    const gtag = (...args: unknown[]) => {
      (window as unknown as { dataLayer: unknown[] }).dataLayer = (window as unknown as { dataLayer: unknown[] }).dataLayer || [];
      (window as unknown as { dataLayer: unknown[] }).dataLayer.push(args);
    };
    
    gtag('js', new Date());
    gtag('config', pubId);
  }, []);

  return <>{children}</>;
}
