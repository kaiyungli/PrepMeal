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
  { href: '/admin', label: '後台' },
  { href: '/', label: '價格' },
  { href: '/login', label: '登入' },
];

export default function Header({ showNav = true }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-bg">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <span className="text-2xl">🍜</span>
            <span className="text-lg font-extrabold text-primary">今晚食乜</span>
          </Link>

          {showNav && (
            <nav className="hidden items-center gap-8 md:flex">
              {navLinks.slice(0, 4).map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className="font-medium text-muted no-underline hover:opacity-80"
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/login" className="font-medium text-muted no-underline hover:opacity-80">
                登入
              </Link>
              <Link
                href="/generate"
                className="rounded-lg bg-primary px-5 py-2 font-medium text-white no-underline shadow-md transition-transform hover:scale-105"
              >
                開始規劃
              </Link>
            </nav>
          )}

          <button className="p-2 text-primary md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
              />
            </svg>
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />

          <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl">
            <div className="flex items-center justify-between bg-primary p-4">
              <span className="font-bold text-white">選單</span>
              <button onClick={() => setMenuOpen(false)} className="text-white">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              <div className="mb-2 py-4 text-center">
                <span className="text-3xl">🍜</span>
                <p className="mt-2 font-bold text-primary">今晚食乜</p>
              </div>
              {navLinks.map((link) => (
                <Link
                  key={`${link.href}-${link.label}-mobile`}
                  href={link.href}
                  className="block border-b border-border py-3 font-medium text-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <div className="mt-6">
                <Link
                  href="/generate"
                  className="block rounded-lg bg-primary py-3 text-center font-bold text-white"
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
