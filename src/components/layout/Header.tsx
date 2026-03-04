import Link from 'next/link';

const colors = {
  cream: '#fefefe',
  brown: '#264653',
  text: '#264653',
  textLight: '#6b7280',
};

interface HeaderProps {
  showNav?: boolean;
}

export default function Header({ showNav = true }: HeaderProps) {
  return (
    <header style={{ 
      background: colors.cream, 
      padding: '20px 40px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      borderBottom: '1px solid #e5e5e5' 
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
        <span style={{ fontSize: '28px' }}>🥘</span>
        <span style={{ fontSize: '22px', fontWeight: 700, color: colors.brown }}>今晚食乜</span>
      </Link>
      
      {showNav && (
        <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <Link href="/" style={{ color: colors.textLight, textDecoration: 'none' }}>首頁</Link>
          <Link href="/generate" style={{ color: colors.text, textDecoration: 'none', fontWeight: 500 }}>生成餐單</Link>
          <Link href="/recipes" style={{ color: colors.textLight, textDecoration: 'none' }}>食譜</Link>
          <Link href="/about" style={{ color: colors.textLight, textDecoration: 'none' }}>關於</Link>
          <Link href="/admin" style={{ color: colors.textLight, textDecoration: 'none' }}>管理</Link>
        </nav>
      )}
    </header>
  );
}
