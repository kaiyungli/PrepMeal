'use client';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { useHeaderController } from '@/features/layout/hooks/useHeaderController';
import Footer from '@/components/layout/Footer';

export default function AdminLogin() {
  const headerCtrl = useHeaderController();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/admin/recipes');
      } else {
        setError(data.error || '登入失敗');
      }
    } catch (err) {
      setError('發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header {...headerCtrl} />
      <Head>
        <title>Admin Login - 今晚食乜</title>
      </Head>
      <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-[#3A2010] mb-6 text-center">
            🔐 管理員登入
          </h1>
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#AA7A50] mb-2">
                密碼
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[#DDD0B0] text-[#3A2010] focus:outline-none focus:border-[#9B6035]"
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#9B6035] text-white py-3 rounded-lg font-medium hover:bg-[#7a4a2a] transition-colors disabled:opacity-50"
            >
              {loading ? '登入中...' : '登入'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/" className="text-[#AA7A50] text-sm hover:underline">
              返回首頁
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
