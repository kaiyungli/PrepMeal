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
    <header className="sticky top-0 z-50" style={{ backgroundColor: '#F8F3E8' }}>
      <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
          <span className="text-2xl">🍜</span>
          <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#9B6035' }}>今晚食乜</span>
        </Link>
        
        {showNav && (
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className="font-medium hover:opacity-80"
                style={{ color: '#AA7A50', textDecoration: 'none' }}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="font-medium hover:opacity-80" style={{ color: '#AA7A50', textDecoration: 'none' }}>
              登入
            </Link>
            <Link 
              href="/generate"
              className="text-white px-5 py-2 rounded-lg shadow-md hover:scale-105 transition-transform"
              style={{ backgroundColor: '#9B6035', textDecoration: 'none', fontWeight: 500 }}
            >
              開始規劃
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
