import '@/styles/globals.css';
import AdSenseLoader from '@/components/ads/AdSenseLoader';
import { AuthProvider } from '@/contexts/AuthContext';

export default function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AdSenseLoader>
        <Component {...pageProps} />
      </AdSenseLoader>
    </AuthProvider>
  );
}