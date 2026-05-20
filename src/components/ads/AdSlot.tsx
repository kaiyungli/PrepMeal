'use client';

import { useEffect, useRef } from 'react';
import { ADS_CONFIG, AD_SLOT_IDS } from '@/constants/ads';

/**
 * Client-side Google AdSense slot
 * Uses correct AdSense API:
 * - data-ad-client (pub ID)
 * - data-ad-slot (slot ID)  
 * - data-ad-format (size format)
 * - data-full-width-responsive
 * - window.adsbygoogle.push({})
 */

interface AdSlotProps {
  /** AdSense slot ID from constants */
  slotId: string;
  /** Ad format for sizing */
  adFormat?: 'horizontal' | 'vertical' | 'rectangle' | 'auto';
  /** Container className */
  className?: string;
}

const FORMAT_HEIGHT = {
  horizontal: 'h-[90px]',
  vertical: 'w-[160px] h-[600px]',
  rectangle: 'w-[300px] h-[250px]',
  auto: 'h-[90px]',
};

export default function AdSlot({ slotId, adFormat = 'auto', className = '' }: AdSlotProps) {
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    // Guard: Don't load if not enabled or no pub ID
    if (!ADS_CONFIG.isEnabled || !ADS_CONFIG.pubId) {
      return;
    }

    // Guard: Only inject script once
    if (!document.querySelector('script[src*="googlesyndication"]')) {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CONFIG.pubId}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    // Push to adsbygoogle if not already loaded for this slot
    const ins = insRef.current;
    if (ins && !ins.getAttribute('data-adsbygoogle-status')) {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
      ins.setAttribute('data-adsbygoogle-status', 'initialized');
    }
  }, [slotId]);

  // Don't render during SSR
  if (!ADS_CONFIG.isEnabled || !ADS_CONFIG.pubId) {
    return (
      <div 
        className={`bg-gray-50 border border-dashed border-gray-300 rounded-lg flex items-center justify-center ${FORMAT_HEIGHT[adFormat]} ${className}`}
        style={{ minHeight: adFormat === 'auto' ? '90px' : adFormat === 'vertical' ? '600px' : adFormat === 'rectangle' ? '250px' : '90px' }}
      >
        <span className="text-gray-400 text-xs">Advertisement</span>
      </div>
    );
  }

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle ${FORMAT_HEIGHT[adFormat]} ${className}`}
      data-ad-client={ADS_CONFIG.pubId}
      data-ad-slot={slotId}
      data-ad-format={adFormat}
      data-full-width-responsive="true"
      style={{ display: 'block', minHeight: adFormat === 'auto' ? '90px' : adFormat === 'vertical' ? '600px' : adFormat === 'rectangle' ? '250px' : '90px' }}
    />
  );
}

// Recipe detail page ad
export function RecipeDetailInArticleAd({ className = 'my-6' }: { className?: string }) {
  return (
    <AdSlot 
      slotId={AD_SLOT_IDS.recipeDetailInArticle} 
      adFormat="horizontal"
      className={className}
    />
  );
}

// Ad below recipe content
export function RecipeDetailBelowContentAd({ className = 'my-6' }: { className?: string }) {
  return (
    <AdSlot 
      slotId={AD_SLOT_IDS.recipeDetailBelowContent} 
      adFormat="horizontal"
      className={className}
    />
  );
}
