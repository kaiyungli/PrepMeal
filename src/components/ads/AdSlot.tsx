'use client';

import { useRef, useEffect } from 'react';
import { ADS_CONFIG, AD_SLOT_IDS } from '@/constants/ads';

/**
 * Client-side Google AdSense slot
 * Only renders <ins> element - script loaded globally via AdSenseLoader
 */

interface AdSlotProps {
  slotId?: string;
  adFormat?: 'horizontal' | 'vertical' | 'rectangle' | 'auto';
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
    // Guard: Only push if script loaded and not already pushed for this slot
    const ins = insRef.current;
    const adsbygoogle = (window as any).adsbygoogle;
    
    if (ins && adsbygoogle && !ins.getAttribute('data-adsbygoogle-status')) {
      try {
        adsbygoogle.push({});
      } catch (e) {
        // Silently ignore if AdSense fails to load
      }
    }
  }, []);

  // Guard: No pub ID or empty slot ID = placeholder
  if (!ADS_CONFIG.isEnabled || !ADS_CONFIG.pubId || !slotId) {
    return (
      <div 
        className={`bg-gray-100 border border-dashed border-gray-300 rounded-lg flex items-center justify-center ${FORMAT_HEIGHT[adFormat]} ${className}`}
        style={{ minHeight: adFormat === 'vertical' ? '600px' : adFormat === 'rectangle' ? '250px' : '90px' }}
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
      style={{ display: 'block', minHeight: adFormat === 'vertical' ? '600px' : adFormat === 'rectangle' ? '250px' : '90px' }}
    />
  );
}

// Recipe detail page ad - use slot ID from constants
export function RecipeDetailInArticleAd({ className = 'my-6' }: { className?: string }) {
  return (
    <AdSlot 
      slotId={AD_SLOT_IDS.recipeDetailInArticle}
      adFormat="horizontal"
      className={className}
    />
  );
}

// Ad below recipe content - use slot ID from constants
export function RecipeDetailBelowContentAd({ className = 'my-6' }: { className?: string }) {
  return (
    <AdSlot 
      slotId={AD_SLOT_IDS.recipeDetailBelowContent}
      adFormat="horizontal"
      className={className}
    />
  );
}
