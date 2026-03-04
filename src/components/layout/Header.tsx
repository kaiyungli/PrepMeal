import Link from 'next/link';

interface HeaderProps {
  showNav?: boolean;
}

const navLinks = [
  { href: '/', label: '首頁' },
  { href: '/generate', label: '生成餐單' },
  { href: '/recipes', label: '食譜' },
  { href: '/about', label: '關於' },
];

export default function Header({ showNav = true }: HeaderProps) {
  return (
    <header style={{ 
      position: 'sticky', 
      top: 0, 
      zIndex: 50, 
      backgroundColor: '#F8F3E8',
      borderBottom: '1px solid #e5e5e5'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '0 16px', 
        height: '64px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between' 
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <span style={{ fontSize: '24px' }}>🍜</span>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#9B6035' }}>今晚食乜</span>
        </Link>
        
        {showNav && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                style={{ 
                  fontWeight: 500, 
                  color: '#AA7A50',
                  textDecoration: 'none'
                }}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/login" style={{ fontWeight: 500, color: '#AA7A50', textDecoration: 'none' }}>
              登入
            </Link>
            <Link 
              href="/generate"
              style={{ 
                color: 'white', 
                padding: '8px 20px', 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                backgroundColor: '#9B6035',
                textDecoration: 'none',
                fontWeight: 500
              }}
            >
              開始規劃
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
