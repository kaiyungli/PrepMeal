'use client';

import { useState } from 'react';
import Link from 'next/link';

interface HeaderProps {
  showNav?: boolean;
}

export default function Header({ showNav = true }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { label: "首頁", path: "/" },
    { label: "食譜", path: "/recipes" },
    { label: "生成餐單", path: "/generate" },
  ];

  return (
    <>
      <header className="h-16 bg-[#F8F3E8] border-b border-[#DDD0B0]">
        <div className="h-full max-w-[1200px] mx-auto px-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-[#9B6035]">
            <span>🍜</span>
            <span>今晚食乜</span>
          </Link>

          {/* Desktop Nav */}
          {showNav && (
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className="text-sm font-semibold text-[#AA7A50] hover:text-[#9B6035] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Mobile Hamburger */}
          {showNav && (
            <button
              className="md:hidden p-2"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <div className="space-y-1.5">
                <span className="block w-6 h-0.5 bg-[#9B6035]"></span>
                <span className="block w-6 h-0.5 bg-[#9B6035]"></span>
                <span className="block w-6 h-0.5 bg-[#9B6035]"></span>
              </div>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Menu */}
      {menuOpen && showNav && (
        <div className="md:hidden bg-[#F8F3E8] border-t border-[#DDD0B0]">
          {navLinks.map((link, i) => (
            <Link
              key={link.path}
              href={link.path}
              className="block py-3 px-4 text-sm font-semibold text-[#AA7A50] border-b border-[#DDD0B0]"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
