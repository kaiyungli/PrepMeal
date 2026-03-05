'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button, Card } from '@/components';
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

export default function MyMenusPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase?.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        loadMenus(user.id);
      }
    };
    checkUser();
  }, [router]);

  const loadMenus = async (userId) => {
    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setMenus(data);
    }
    setLoading(false);
  };

  const deleteMenu = async (id) => {
    if (!confirm('確定要刪除呢個餐單嗎？')) return;
    
    await supabase
      .from('menus')
      .delete()
      .eq('id', id);
    
    setMenus(prev => prev.filter(m => m.id !== id));
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
      <Head><title>我既餐單 - 今晚食乜</title></Head>
      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}<div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.brown, marginBottom: '8px' }}>📋 我既餐單</h1>
              <p style={{ color: colors.textLight }}>你儲存既餐單</p>
            </div>
            <Link href="/generate">
              <Button>+ 新建餐單</Button>
            </Link>
          </div>

          {menus.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: '48px', marginBottom: '16px' }}>📋</p>
              <p style={{ color: colors.textLight, marginBottom: '24px' }}>暫時未有儲存既餐單</p>
              <Link href="/generate">
                <Button>生成餐單</Button>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {menus.map((menu) => {
                const menuItems = menu.menu_data || [];
                const days = [...new Set(menuItems.map(m => m.day))];
                
                return (
                  <div key={menu.id} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.brown }}>{menu.name}</h3>
                        <p style={{ fontSize: '12px', color: colors.textLight, marginTop: '4px' }}>
                          {new Date(menu.created_at).toLocaleDateString('zh-HK')} · {days.length}日 · {menuItems.length}餐
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => deleteMenu(menu.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {days.slice(0, 7).map((day, i) => (
                        <span key={i} style={{ background: colors.lightBg, padding: '4px 10px', borderRadius: '4px', fontSize: '12px', color: colors.text }}>
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer style={{ textAlign: 'center', padding: '40px', color: colors.textLight, borderTop: '1px solid #e5e5e5', background: colors.lightBg }}>
          <p>© 2026 今晚食乜 Made with ❤️</p>
        </footer>
      </div>
    </>
  );
}
