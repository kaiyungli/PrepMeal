import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { ADS_CONFIG, AD_SLOT_IDS, isAdSenseEnabled, isPublicAdPage, isVerifiedAdSlot } from '@/constants/ads';
import { loadAdSense } from './loadAdSense';

type AdWindow = Window & { adsbygoogle?: { push: (request: Record<string, never>) => unknown } };
interface AdSlotProps {
  slotId?: string;
  adFormat?: 'horizontal' | 'vertical' | 'rectangle' | 'auto';
  className?: string;
}
const FORMAT_HEIGHT = {
  horizontal: 'h-[90px]', vertical: 'w-[160px] h-[600px]',
  rectangle: 'w-[300px] h-[250px]', auto: 'h-[90px]',
};

function ActiveAdSlot({ slotId, adFormat = 'auto', className = '' }: AdSlotProps) {
  const insRef = useRef<HTMLModElement | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void loadAdSense().then(() => {
      const ins = insRef.current;
      // A late SDK response must not request an ad after route change/unmount.
      if (!active || !ins || !ins.isConnected || ins.dataset.prepmealRequested
        || ins.getAttribute('data-adsbygoogle-status')) return;
      const sdk = (window as AdWindow).adsbygoogle;
      if (!sdk) throw new Error('AdSense unavailable');
      ins.dataset.prepmealRequested = 'true';
      sdk.push({});
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  if (failed) return null;
  return (
    <ins ref={insRef} className={`adsbygoogle ${FORMAT_HEIGHT[adFormat]} ${className}`}
      data-ad-client={ADS_CONFIG.pubId} data-ad-slot={slotId} data-ad-format={adFormat}
      data-full-width-responsive="true" style={{ display: 'block' }} />
  );
}

function RoutedAdSlot(props: AdSlotProps) {
  const router = useRouter();
  if (router.isFallback || !isPublicAdPage(router.pathname)) return null;
  return <ActiveAdSlot key={`${router.asPath.split(/[?#]/)[0]}:${props.slotId}`} {...props} />;
}

export default function AdSlot(props: AdSlotProps) {
  // No empty Advertisement box, SDK load or queue call for unreviewed config.
  if (!isAdSenseEnabled() || !isVerifiedAdSlot(props.slotId)) return null;
  return <RoutedAdSlot {...props} />;
}

export function RecipeDetailInArticleAd({ className = 'my-6' }: { className?: string }) {
  return <AdSlot slotId={AD_SLOT_IDS.recipeDetailInArticle} adFormat="horizontal" className={className} />;
}
export function RecipeDetailBelowContentAd({ className = 'my-6' }: { className?: string }) {
  return <AdSlot slotId={AD_SLOT_IDS.recipeDetailBelowContent} adFormat="horizontal" className={className} />;
}
