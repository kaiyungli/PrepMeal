// OAuth callback page - handles session after OAuth redirect
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    // Handle the OAuth callback
    const handleCallback = async () => {
      try {
        // Check for error in URL query (OAuth error)
        if (router.query.error) {
          setError(router.query.error_description || router.query.error);
          setProcessing(false);
          return;
        }

        // Supabase OAuth returns session in URL hash (#access_token=...)
        // getSession() will automatically exchange the code/token for a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('登入驗證失敗，請重試');
          setProcessing(false);
          return;
        }

        if (session?.user) {
          // Successful login - get redirect URL
          const redirect = router.query.redirect || '/my-plans';
          const finalUrl = redirect.startsWith('/') ? redirect : '/my-plans';
          
          console.log('OAuth success, user:', session.user.email, 'redirecting to:', finalUrl);
          
          // Small delay to ensure session is fully established in browser
          setTimeout(() => {
            router.replace(finalUrl);
          }, 500);
        } else {
          // No session - might be expired or failed
          setError('登入階段已過期，請重新登入');
          setProcessing(false);
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError('處理登入時發生錯誤');
        setProcessing(false);
      }
    };

    // Only run after router is ready
    if (router.isReady) {
      handleCallback();
    }
  }, [router]);

  // If still processing, show loading
  if (processing) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F3E8',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            border: '4px solid #E5DCC8',
            borderTopColor: '#9B6035',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ color: '#7A5A38', margin: 0 }}>
            正在完成登入...
          </p>
        </div>
      </div>
    );
  }

  // If error, show error message with retry button
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F8F3E8',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ 
        textAlign: 'center',
        padding: 32,
        backgroundColor: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <p style={{ color: '#C44', marginBottom: 16 }}>
          {error || '登入失敗'}
        </p>
        <button
          onClick={() => router.push('/login')}
          style={{
            backgroundColor: '#9B6035',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 16
          }}
        >
          返回登入頁面
        </button>
      </div>
    </div>
  );
}
