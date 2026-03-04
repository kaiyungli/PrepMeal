'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import supabase from '@/lib/supabase';

const colors = {
  cream: '#fefefe',
  brown: '#264653',
  yellow: '#E76F51',
  lightBg: '#faf8f5',
  text: '#264653',
  textLight: '#6b7280',
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
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase?.auth.getUser();
      if (user) {
        router.push('/profile');
      }
    };
    checkUser();
  }, [router]);

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
        router.push('/profile');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>登入 - 今晚食乜</title></Head>
      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}
        <header style={{ background: colors.cream, padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e5e5' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <span style={{ fontSize: '24px' }}>🥘</span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: colors.brown }}>今晚食乜</span>
          </Link>
          <nav style={{ display: 'flex', gap: '24px' }}>
            <Link href="/" style={{ color: colors.text, textDecoration: 'none', fontWeight: 500 }}>首頁</Link>
            <Link href="/about" style={{ color: colors.text, textDecoration: 'none', fontWeight: 500 }}>關於</Link>
          </nav>
        </header>

        {/* Login Form */}
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
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', fontSize: '14px', border: '1px solid #e5e5e5', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' }}
                placeholder="your@email.com"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ width: '100%', padding: '12px', fontSize: '14px', border: '1px solid #e5e5e5', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600, background: loading ? '#ccc' : colors.yellow, color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '16px' }}
            >
              {loading ? '載入中...' : (isSignUp ? '註冊' : '登入')}
            </button>
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
