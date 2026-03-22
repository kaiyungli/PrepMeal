'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components';
import supabase from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

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
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase?.auth.getUser();
      if (user) {
        const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/profile';
        router.push(redirectUrl);
      }
    };
    checkUser();
  }, [router]);

  const { signInWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
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
        const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/profile';
        router.push(redirectUrl);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <Head><title>登入 - 今晚食乜</title></Head>
      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}{/* Login Form */}
        <div style={{ maxWidth: '400px', margin: '60px auto', padding: '40px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.brown, marginBottom: '8px', textAlign: 'center' }}>
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
              type="text"
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
              style={{ background: 'none', border: 'none', color: colors.yellow, cursor: 'pointer', fontWeight: 600, marginLeft: '4px' }}
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
