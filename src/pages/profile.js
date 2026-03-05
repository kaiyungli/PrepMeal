'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button, Input } from '@/components';
import supabase from '@/lib/supabase';

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
      <Header />
      <Head><title>個人資料 - 今晚食乜</title></Head>
      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}{/* Profile */}
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
            <Input
              label="顯示名稱"
              value={name}
              onChange={setName}
              placeholder="你的名稱"
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button type="submit" disabled={saving}>
                {saving ? '儲存中...' : '儲存'}
              </Button>
              <Button variant="secondary" onClick={handleLogout}>
                登出
              </Button>
            </div>
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
