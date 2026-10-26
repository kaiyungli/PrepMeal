import { ADSENSE_CLIENT_ID } from '@/constants/ads';

let loading: Promise<void> | undefined;

// Called only after both a reviewed slot and an allowed page have mounted.
// A script is not verification: _document uses Google's non-executing meta tag.
export function loadAdSense(): Promise<void> {
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
    script.dataset.prepmealAdsense = 'loading';
    script.onload = () => { script.dataset.prepmealAdsense = 'ready'; resolve(); };
    script.onerror = () => {
      script.remove();
      loading = undefined;
      reject(new Error('AdSense unavailable'));
    };
    document.head.appendChild(script);
  });
  return loading;
}
