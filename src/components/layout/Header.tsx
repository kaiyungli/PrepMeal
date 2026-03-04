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
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🍜</span>
          <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#9B6035' }}>今晚食乜</span>
        </Link>
        
        {showNav && (
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className="font-medium hover:opacity-80 transition-opacity"
                style={{ color: '#AA7A50' }}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="font-medium" style={{ color: '#AA7A50' }}>
              登入
            </Link>
            <Link 
              href="/generate"
              className="text-white px-5 py-2 rounded-lg shadow-md transition-transform hover:scale-105"
              style={{ backgroundColor: '#9B6035' }}
            >
              開始規劃
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
