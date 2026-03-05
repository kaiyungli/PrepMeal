'use client';
import Link from 'next/link';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const colors = {
  cream: '#fefefe',
  brown: '#264653',
  yellow: '#E76F51',
  lightBg: '#faf8f5',
  text: '#264653',
  textLight: '#6b7280',
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <Head><title>今晚食乜 - 關於我們</title></Head>
      <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}{/* Hero */}
        <div style={{ background: colors.brown, padding: '60px 20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>關於「今晚食乜」</h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', maxWidth: '600px', margin: '0 auto' }}>每日決策「今晚食乜」？比我哋幫你諗!</p>
        </div>

        {/* Features */}
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.brown, marginBottom: '32px', textAlign: 'center' }}>🌟 功能特色</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '60px' }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>🎲</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: colors.brown, marginBottom: '8px' }}>智能餐單生成</h3>
              <p style={{ fontSize: '14px', color: colors.textLight, lineHeight: '1.6' }}>根據你既口味、時間、難度偏好，一鍵生成完整一週餐單</p>
            </div>
            
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>🛒</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: colors.brown, marginBottom: '8px' }}>自動食材清單</h3>
              <p style={{ fontSize: '14px', color: colors.textLight, lineHeight: '1.6' }}>生成餐單既同時，自動整理所需食材，買餸更方便</p>
            </div>
            
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔥</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: colors.brown, marginBottom: '8px' }}>卡路里計算</h3>
              <p style={{ fontSize: '14px', color: colors.textLight, lineHeight: '1.6' }}>顯示每餐卡路里，幫你監控每日熱量攝取</p>
            </div>
            
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>📱</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: colors.brown, marginBottom: '8px' }}>手機友善</h3>
              <p style={{ fontSize: '14px', color: colors.textLight, lineHeight: '1.6' }}>支援手機、平板、電腦，隨時隨地plan你既餐單</p>
            </div>
          </div>

          {/* How to Use */}
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.brown, marginBottom: '32px', textAlign: 'center' }}>📖 使用方法</h2>
          
          <div style={{ background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: '60px' }}>
            <ol style={{ paddingLeft: '20px' }}>
              <li style={{ fontSize: '16px', color: colors.text, marginBottom: '16px', lineHeight: '1.8' }}>
                <strong style={{ color: colors.brown }}>選擇條件</strong> - 係「生成餐單」頁面，選擇你鐘意既菜式類型、煮食時間、難度
              </li>
              <li style={{ fontSize: '16px', color: colors.text, marginBottom: '16px', lineHeight: '1.8' }}>
                <strong style={{ color: colors.brown }}>設定人數同餐數</strong> - 選擇有幾多人食，一日想食幾多餐
              </li>
              <li style={{ fontSize: '16px', color: colors.text, marginBottom: '16px', lineHeight: '1.8' }}>
                <strong style={{ color: colors.brown }}>生成餐單</strong> - 一click生成完整一週餐單
              </li>
              <li style={{ fontSize: '16px', color: colors.text, marginBottom: '16px', lineHeight: '1.8' }}>
                <strong style={{ color: colors.brown }}>睇食材清單</strong> - 即時睇到需要買咩食材
              </li>
              <li style={{ fontSize: '16px', color: colors.text, lineHeight: '1.8' }}>
                <strong style={{ color: colors.brown }}>重新生成</strong> - 如果唔啱可以随时重新生成新餐單
              </li>
            </ol>
          </div>

          {/* Team */}
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.brown, marginBottom: '32px', textAlign: 'center' }}>👥 團隊資訊</h2>
          
          <div style={{ background: colors.lightBg, padding: '32px', borderRadius: '12px', textAlign: 'center', marginBottom: '60px' }}>
            <p style={{ fontSize: '16px', color: colors.text, marginBottom: '16px', lineHeight: '1.8' }}>
              「今晚食乜」由熱愛烹飪同科技既團隊開發
            </p>
            <p style={{ fontSize: '14px', color: colors.textLight, marginBottom: '24px', lineHeight: '1.8' }}>
              我哋既目標係解決每日既世紀難題 — 「今晚食乜」？
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/" style={{ padding: '12px 24px', background: colors.yellow, color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>開始使用</Link>
              <Link href="/recipes" style={{ padding: '12px 24px', background: colors.brown, color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>睇食譜</Link>
            </div>
          </div>

          {/* Contact */}
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.brown, marginBottom: '32px', textAlign: 'center' }}>📧 聯絡我們</h2>
          
          <div style={{ textAlign: 'center', paddingBottom: '60px' }}>
            <p style={{ fontSize: '14px', color: colors.textLight, lineHeight: '1.8' }}>
              有問題或建議？歡迎 email 比我哋！
            </p>
            <p style={{ fontSize: '16px', color: colors.brown, fontWeight: 500, marginTop: '12px' }}>
              hello@今晚食乜.com
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '40px', color: colors.textLight, borderTop: '1px solid #e5e5e5', background: colors.lightBg }}>
          <p>© 2026 今晚食乜 Made with ❤️</p>
        </footer>
      </div>
    </>
  );
}
