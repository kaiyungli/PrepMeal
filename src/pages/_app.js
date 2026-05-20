import '@/styles/globals.css';
import Script from 'next/script';
import { AuthProvider } from '@/contexts/AuthContext';

export default function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      {/* AdSense script - afterInteractive for SEO detection */}
      <Script
        id="adsense-script"
        async
        strategy="afterInteractive"
        src={process.env.NEXT_PUBLIC_ADSENSE_PUB_ID 
          ? `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUB_ID}`
          : undefined}
        crossOrigin="anonymous"
      />
    </AuthProvider>
  );
}
