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

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase?.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        setName(user.user_metadata?.name || user.email?.split('@')[0] || '');
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase?.auth.signOut();
    router.push('/');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase?.auth.updateUser({
        data: { name }
      });
      if (error) throw error;
      setMessage('✅ 資料已更新！');
    } catch (err) {
      setMessage('❌ 更新失敗：' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: colors.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <>
      <Head><title>個人資料 - 今晚食乜</title></Head>
      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}
        <header style={{ background: colors.cream, padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e5e5' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <span style={{ fontSize: '24px' }}>🥘</span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: colors.brown }}>今晚食乜</span>
          </Link>
          <nav style={{ display: 'flex', gap: '24px' }}>
            <Link href="/" style={{ color: colors.text, textDecoration: 'none', fontWeight: 500 }}>首頁</Link>
            <Link href="/generate" style={{ color: colors.text, textDecoration: 'none', fontWeight: 500 }}>生成餐單</Link>
            <Link href="/recipes" style={{ color: colors.text, textDecoration: 'none', fontWeight: 500 }}>食譜</Link>
            <Link href="/about" style={{ color: colors.text, textDecoration: 'none', fontWeight: 500 }}>關於</Link>
            <Link href="/profile" style={{ color: colors.yellow, textDecoration: 'none', fontWeight: 600 }}>個人</Link>
          </nav>
        </header>

        {/* Profile */}
        <div style={{ maxWidth: '600px', margin: '60px auto', padding: '40px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.brown, marginBottom: '8px' }}>個人資料</h1>
          <p style={{ color: colors.textLight, marginBottom: '32px' }}>管理你既帳戶資料</p>

          {message && (
            <div style={{ padding: '12px', background: message.includes('✅') ? '#dcfce7' : '#fee2e2', color: message.includes('✅') ? '#16a34a' : '#dc2626', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              {message}
            </div>
          )}

          <div style={{ marginBottom: '32px', padding: '20px', background: colors.lightBg, borderRadius: '8px' }}>
            <p style={{ fontSize: '14px', color: colors.textLight, marginBottom: '4px' }}>Email</p>
            <p style={{ fontSize: '16px', color: colors.text, fontWeight: 500 }}>{user?.email}</p>
          </div>

          <form onSubmit={handleUpdate}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>顯示名稱</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '12px', fontSize: '14px', border: '1px solid #e5e5e5', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' }}
                placeholder="你的名稱"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{ padding: '12px 24px', fontSize: '16px', fontWeight: 600, background: saving ? '#ccc' : colors.yellow, color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', marginRight: '12px' }}
            >
              {saving ? '儲存中...' : '儲存'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              style={{ padding: '12px 24px', fontSize: '16px', fontWeight: 600, background: 'transparent', color: colors.text, border: '1px solid #e5e5e5', borderRadius: '8px', cursor: 'pointer' }}
            >
              登出
            </button>
          </form>
        </div>

        {/* Saved Recipes Section */}
        <div style={{ maxWidth: '600px', margin: '0 auto 60px', padding: '0 20px' }}>
          <div style={{ padding: '24px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: colors.brown, marginBottom: '16px' }}>儲存既食譜</h2>
            <p style={{ color: colors.textLight, fontSize: '14px' }}>暫時未有儲存既食譜</p>
          </div>
        </div>

        <footer style={{ textAlign: 'center', padding: '40px', color: colors.textLight, borderTop: '1px solid #e5e5e5', background: colors.lightBg }}>
          <p>© 2026 今晚食乜 Made with ❤️</p>
        </footer>
      </div>
    </>
  );
}
