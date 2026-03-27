// OAuth callback page - handles session after OAuth redirect
// Uses Supabase's auto detectSessionInUrl - no manual code exchange needed
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '@/lib/supabase';
import { getRedirectUrl } from '@/lib/authRedirect';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    // Run callback handler when router is ready
    if (!router.isReady) return;

    const handleCallback = async () => {
      try {
        // === DIAGNOSTICS START ===
        console.log('[AuthCallback] ===== DIAGNOSTICS =====');
        console.log('[AuthCallback] window.location.href:', window.location.href);
        console.log('[AuthCallback] router.query:', JSON.stringify(router.query));
        console.log('[AuthCallback] Has code:', !!router.query.code);
        console.log('[AuthCallback] Has error:', !!router.query.error);
        console.log('[AuthCallback] Has error_description:', !!router.query.error_description);
        // === DIAGNOSTICS END ===

        // 1. Check for OAuth error in URL
        if (router.query.error) {
          setError(router.query.error_description || router.query.error);
          setProcessing(false);
          return;
        }

        // 2. Let Supabase auto-detect session from URL (detectSessionInUrl handles PKCE)
        // No manual exchangeCodeForSession needed - that would cause double-consumption
        console.log('[AuthCallback] Calling getSession()...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        // === DIAGNOSTICS START ===
        console.log('[AuthCallback] getSession result:', { sessionData, sessionError });
        console.log('[AuthCallback] sessionData.session exists:', !!sessionData?.session);
        console.log('[AuthCallback] sessionData.session?.user exists:', !!sessionData?.session?.user);
        
        // Also try getUser to see if there's a user without session
        console.log('[AuthCallback] Calling getUser()...');
        const { data: userData, error: userError } = await supabase.auth.getUser();
        console.log('[AuthCallback] getUser result:', { userData, userError });
        // === DIAGNOSTICS END ===
        
        if (sessionError) {
          console.error('[AuthCallback] Session error:', sessionError);
          setError('登入驗證失敗，請重試');
          setProcessing(false);
          return;
        }

        if (sessionData?.session?.user) {
          const redirectUrl = getRedirectUrl({ windowOrRouter: router });
          router.replace(redirectUrl);
        } else {
          // No session found - OAuth flow failed or session expired
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
  }, [router.isReady, router.query.code, router.query.redirect, router.query.error, router.query.error_description]);

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