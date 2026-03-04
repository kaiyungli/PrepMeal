'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button, Card } from '@/components';
import supabase from '@/lib/supabase';

const colors = {
  cream: '#fefefe',
  brown: '#264653',
  yellow: '#E76F51',
  lightBg: '#faf8f5',
  text: '#264653',
  textLight: '#6b7280',
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
      <Head><title>我既餐單 - 今晚食乜</title></Head>
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
            <Link href="/favorites" style={{ color: colors.text, textDecoration: 'none', fontWeight: 500 }}>收藏</Link>
            <Link href="/profile" style={{ color: colors.yellow, textDecoration: 'none', fontWeight: 600 }}>個人</Link>
          </nav>
        </header>

        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
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
