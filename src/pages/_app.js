import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import NavigationMeasurementOverlay from '@/features/performance/NavigationMeasurement';

/**
 * App wrapper - AdSense loaded via _document.js for verification
 */
export default function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <NavigationMeasurementOverlay />
    </AuthProvider>
  );
}
