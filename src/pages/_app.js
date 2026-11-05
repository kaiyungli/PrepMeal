import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import Head from 'next/head';
import NavigationMeasurementOverlay from '@/features/performance/NavigationMeasurement';
import { isNoIndexRoute } from '@/lib/seoIndexing';
import { useEffect } from 'react';
import { startErrorMonitoring } from '@/lib/errorMonitoring';

/**
 * App wrapper - ad SDK is gated by reviewed slots and public-page policy
 */
export default function MyApp({ Component, pageProps, router }) {
  useEffect(() => { startErrorMonitoring(); }, []);

  return (
    <AuthProvider>
      {isNoIndexRoute(router?.pathname) && (
        <Head><meta name="robots" content="noindex" key="robots" /></Head>
      )}
      <Component {...pageProps} />
      <NavigationMeasurementOverlay />
    </AuthProvider>
  );
}
