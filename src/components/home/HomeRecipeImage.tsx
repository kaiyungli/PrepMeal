import Image from 'next/image';
import { useState } from 'react';

/** One optimizer stage, one original-source attempt, then a stable placeholder.
 * Next may replay its initial src once when attaching hydration error handlers.
 * Parents key by source so a genuinely different recipe gets its own attempts. */
export default function HomeRecipeImage({ src, alt, width, height, sizes, className, priority = false, onUnavailable }: {
  src?: string | null; alt: string; width: number; height: number; sizes: string; className: string;
  priority?: boolean; onUnavailable?: () => void;
}) {
  const [stage, setStage] = useState<'optimized' | 'original' | 'unavailable'>('optimized');
  const failed = () => {
    if (stage === 'optimized') setStage('original');
    else if (stage === 'original') { setStage('unavailable'); onUnavailable?.(); }
  };
  if (!src || stage === 'unavailable') return <span className={`${className} pm-photo-fallback`} aria-hidden="true">圖片暫未能顯示</span>;
  if (stage === 'original') {
    // eslint-disable-next-line @next/next/no-img-element -- A single original-source attempt bypasses a failed optimizer.
    return <img src={src} alt={alt} width={width} height={height} className={className} loading={priority ? 'eager' : 'lazy'} onError={failed} />;
  }
  return <Image src={src} alt={alt} width={width} height={height} sizes={sizes} className={className} priority={priority} onError={failed} />;
}
