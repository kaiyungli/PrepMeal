// OAuth callback page - handles session after OAuth redirect (PKCE flow)
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    // Run callback handler when router is ready
    if (!router.isReady) return;

    const handleCallback = async () => {
      console.log('[AuthCallback] Starting callback处理');
      console.log('[AuthCallback] Query params:', router.query);
      
      try {
        // 1. Check for OAuth error in URL
        if (router.query.error) {
          console.log('[AuthCallback] OAuth error:', router.query.error);
          setError(router.query.error_description || router.query.error);
          setProcessing(false);
          return;
        }

        // 2. PKCE flow: exchange code for session
        const code = router.query.code;
        
        if (code) {
          console.log('[AuthCallback] Exchanging code for session...');
          const result = await supabase.auth.exchangeCodeForSession(code);
          const { data: session, error: exchangeError } = result;
          
          if (exchangeError) {
            console.error('[AuthCallback] Code exchange error:', exchangeError);
            setError('登入驗證失敗: ' + exchangeError.message);
            setProcessing(false);
            return;
          }

          if (session?.user) {
            console.log('[AuthCallback] PKCE session established, user:', session.user.email);
            const redirect = router.query.redirect || '/my-plans';
            const finalUrl = redirect.startsWith('/') ? redirect : '/my-plans';
            console.log('[AuthCallback] Redirecting to:', finalUrl);
            router.replace(finalUrl);
            return;
          }
        }

        // 3. Fallback: try getSession() (implicit/hybrid flow)
        console.log('[AuthCallback] Trying getSession() fallback...');
        const sessionResult = await supabase.auth.getSession();
        const { data: session, error: sessionError } = sessionResult;
        
        if (sessionError) {
          console.error('[AuthCallback] Session error:', sessionError);
          setError('登入驗證失敗，請重試');
          setProcessing(false);
          return;
        }

        if (session?.user) {
          console.log('[AuthCallback] OAuth success, user:', session.user.email);
          const redirect = router.query.redirect || '/my-plans';
          const finalUrl = redirect.startsWith('/') ? redirect : '/my-plans';
          console.log('[AuthCallback] Redirecting to:', finalUrl);
          router.replace(finalUrl);
        } else {
          console.log('[AuthCallback] No session - code:', code, 'query:', router.query);
          setError('登入階段已過期，請重新登入');
          setProcessing(false);
        }
      } catch (err) {
        console.error('[AuthCallback] Callback error:', err);
        setError('處理登入時發生錯誤: ' + err.message);
        setProcessing(false);
      }
    };

    handleCallback();
  }, [router]);

  // Show loading state
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

  // Show error state
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
