import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

/**
 * App wrapper - AdSense loaded via _document.js for verification
 */
export default function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
