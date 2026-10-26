import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import NavigationMeasurementOverlay from '@/features/performance/NavigationMeasurement';

/**
 * App wrapper - ad SDK is gated by reviewed slots and public-page policy
 */
export default function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <NavigationMeasurementOverlay />
    </AuthProvider>
  );
}
