// Auth guard helper - redirects to login if not authenticated
import { useAuth } from './useAuth';
import { useRouter } from 'next/router';

export function useAuthGuard() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const requireAuth = (callback) => {
    if (loading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Execute callback if provided
    if (callback && typeof callback === 'function') {
      callback();
    }
  };

  const requireAuthOrAlert = (message = '請先登入') => {
    if (!isAuthenticated) {
      alert(message);
      return false;
    }
    return true;
  };

  return {
    isAuthenticated,
    loading,
    requireAuth,
    requireAuthOrAlert,
  };
}
