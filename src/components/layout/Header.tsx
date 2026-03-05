'use client';
import { useState } from 'react';
import Link from 'next/link';

interface HeaderProps {
  showNav?: boolean;
}

const navLinks = [
  { href: '/', label: '首頁' },
  { href: '/generate', label: '生成餐單' },
  { href: '/recipes', label: '食譜' },
  { href: '/', label: '價格' },
  { href: '/login', label: '登入' },
];

export default function Header({ showNav = true }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50" style={{ backgroundColor: '#F8F3E8' }}>
        <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
            <span className="text-2xl">🍜</span>
            <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#9B6035' }}>今晚食乜</span>
          </Link>
          
          {/* Desktop Nav */}
          {showNav && (
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.slice(0, 4).map((link) => (
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

          {/* Mobile Menu Button - Right Side */}
          <button 
            className="md:hidden p-2"
            style={{ color: '#9B6035' }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Drawer - Right Side */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/30"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Drawer - Right Side */}
          <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl">
            <div className="p-4 flex justify-between items-center" style={{ backgroundColor: '#9B6035' }}>
              <span className="text-white font-bold">選單</span>
              <button onClick={() => setMenuOpen(false)} className="text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <div className="text-center py-4 mb-2">
                <span className="text-3xl">🍜</span>
                <p className="font-bold mt-2" style={{ color: '#9B6035' }}>今晚食乜</p>
              </div>
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className="block py-3 border-b font-medium"
                  style={{ color: '#AA7A50', borderColor: '#DDD0B0' }}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="mt-6">
                <Link 
                  href="/generate"
                  className="block text-center py-3 rounded-lg text-white font-bold"
                  style={{ backgroundColor: '#9B6035' }}
                  onClick={() => setMenuOpen(false)}
                >
                  開始規劃
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
