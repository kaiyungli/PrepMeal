'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import { useHeaderController } from '@/features/layout/hooks/useHeaderController';
import { Button } from '@/components';
import supabase from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getRedirectUrl } from '@/lib/authRedirect';

const colors = {
  background: '#F8F3E8',
  primary: '#9B6035',
  secondary: '#C8D49A',
  accent: '#F0A060',
  text: '#3A2010',
  textLight: '#AA7A50',
  cream: '#F8F3E8',
  lightBg: '#F8F3E8',
  white: '#FFFFFF',
  sage: '#C8D49A',
  brown: '#9B6035',
  yellow: '#F0A060',
};

export default function LoginPage() {
  const headerCtrl = useHeaderController();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Use auth state with loading indicator
  const { user, isAuthenticated, loading: authLoading, signInWithGoogle, signInWithApple, signInWithFacebook } = useAuth();

  // Redirect if already logged in - only after auth hydration is complete
  useEffect(() => {
    // Wait for auth to finish hydrating
    if (authLoading) return;
    
    // Only redirect if actually authenticated
    if (isAuthenticated && user) {
      const redirectUrl = getRedirectUrl({ windowOrRouter: router });
      router.push(redirectUrl);
    }
  }, [authLoading, isAuthenticated, user, router]);

  const handleGoogleLogin = async () => {
    console.log('🔥 Google login clicked');
    setLocalLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      // OAuth triggers redirect, don't reset loading here
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.message || 'Google 登入失敗');
      setLocalLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    console.log('🔥 Apple login clicked');
    setLocalLoading(true);
    setError('');
    try {
      await signInWithApple();
      // OAuth triggers redirect, don't reset loading here
    } catch (err) {
      console.error('Apple login error:', err);
      setError(err.message || 'Apple 登入失敗');
      setLocalLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    console.log('🔥 Facebook login clicked');
    setLocalLoading(true);
    setError('');
    try {
      await signInWithFacebook();
      // OAuth triggers redirect, don't reset loading here
    } catch (err) {
      console.error('Facebook login error:', err);
      setError(err.message || 'Facebook 登入失敗');
      setLocalLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        const { error } = await supabase?.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('✅ 註冊成功！請查收email確認連結');
      } else {
        const { error } = await supabase?.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        const redirectUrl = getRedirectUrl({ windowOrRouter: router });
        router.push(redirectUrl);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const loading = localLoading || authLoading;

  return (
    <>
      <Header {...headerCtrl} />
      <Head><title>登入 - 今晚食乜</title></Head>
      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}
        {/* Login Form */}
        <div style={{ maxWidth: '400px', margin: '60px auto', padding: '40px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.brown, marginBottom: '8px', textAlign: 'center' }}>
            {isSignUp ? '註冊' : '登入'}
          </h1>
          <p style={{ textAlign: 'center', color: colors.textLight, marginBottom: '32px' }}>
            {isSignUp ? '建立新帳戶' : '歡迎返嚟！'}
          </p>

          {error && (
            <div style={{ padding: '12px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{ padding: '12px', background: '#dcfce7', color: '#16a34a', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: 'white', color: '#3A2010', border: '1px solid #E5DCC8', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? '載入中...' : '使用 Google 登入'}
          </button>

          <button
            type="button"
            onClick={handleAppleLogin}
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: 'white', color: '#3A2010', border: '1px solid #E5DCC8', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.9 4.5-3.74 4.25z"/>
            </svg>
            {loading ? '載入中...' : '使用 Apple 登入'}
          </button>

          <button
            type="button"
            onClick={handleFacebookLogin}
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: 'white', color: '#3A2010', border: '1px solid #E5DCC8', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {loading ? '載入中...' : '使用 Facebook 登入'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#E5DCC8' }}></div>
            <span style={{ padding: '0 12px', color: '#AA7A50', fontSize: '12px' }}>或使用以下方式登入</span>
            <div style={{ flex: 1, height: '1px', background: '#E5DCC8' }}></div>
          </div>

          <form onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="your@email.com"
              required
            />
            <Input
              label="密碼"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
            />

            <Button type="submit" disabled={loading} style={{ width: '100%', marginBottom: '16px' }}>
              {loading ? '載入中...' : (isSignUp ? '註冊' : '登入')}
            </Button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '14px', color: colors.textLight }}>
            {isSignUp ? '已經有帳戶？' : '未有任何帳戶？'}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
              style={{ background: 'none', border: 'none', color: colors.yellow, cursor: 'pointer', fontWeight: '600', marginLeft: '4px' }}
            >
              {isSignUp ? '登入' : '註冊'}
            </button>
          </p>
        </div>

        <footer style={{ textAlign: 'center', padding: '40px', color: colors.textLight, borderTop: '1px solid #e5e5e5', background: colors.lightBg }}>
          <p>© 2026 今晚食乜 Made with ❤️</p>
        </footer>
      </div>
    </>
  );
}

import { Input } from '@/components';