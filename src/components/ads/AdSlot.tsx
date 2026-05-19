'use client';

import { useEffect, useState } from 'react';
import { ADS_CONFIG } from '@/constants/ads';

interface AdSlotProps {
  slotId: string;
  adFormat?: 'horizontal' | 'vertical' | 'rectangle' | 'auto';
  className?: string;
}

/**
 * Client-only AdSense slot renderer
 * Only renders when AdSense is configured
 */
export default function AdSlot({ slotId, adFormat = 'auto', className = '' }: AdSlotProps) {
  const [mounted, setMounted] = useState(false);
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if we should show ads
    if (ADS_CONFIG.isEnabled && ADS_CONFIG.pubId) {
      setShowAd(true);
    }
  }, []);

  // Don't render during SSR or if disabled
  if (!mounted || !showAd) {
    return (
      <div className={`bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-center py-4 ${className}`}>
        <span className="text-gray-400 text-sm">Advertisement</span>
      </div>
    );
  }

  // Render AdSense script only client-side
  return (
    <ins
      className={`adsbypub ${adFormat === 'horizontal' ? 'w-full h-auto' : adFormat === 'vertical' ? 'w-[160px] h-[600px]' : adFormat === 'rectangle' ? 'w-[300px] h-[250px]' : 'w-full'}`}
      data-ad-slot={slotId}
      data-ad-format={adFormat}
      data-full-width-responsive="true"
    />
  );
}

// Convenience component for recipe detail page
export function RecipeDetailAd() {
  return (
    <div className="my-8">
      <AdSlot 
        slotId={ADS_CONFIG.slots.recipeDetailInArticle} 
        adFormat="horizontal"
        className="mb-4"
      />
    </div>
  );
}
