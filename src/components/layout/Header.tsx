'use client';

import Link from 'next/link';

interface HeaderProps {
  showNav?: boolean;
}

export default function Header({ showNav = true }: HeaderProps) {
  return (
    <header className="h-16 border-b border-[#E5DCC8] bg-white flex items-center justify-between px-6">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[#9B6035]">
        <span>🍜</span>
        <span>今晚食乜</span>
      </Link>

      {/* Nav */}
      {showNav && (
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-[#3A2010] hover:text-[#9B6035]">首頁</Link>
          <Link href="/generate" className="text-[#3A2010] hover:text-[#9B6035]">生成餐單</Link>
          <Link href="/recipes" className="text-[#3A2010] hover:text-[#9B6035]">食譜</Link>
          
          {/* CTA */}
          <Link 
            href="/generate" 
            className="px-4 py-2 bg-[#9B6035] text-white rounded-lg font-medium hover:bg-[#8B5530]"
          >
            開始使用
          </Link>
        </nav>
      )}
    </header>
  );
}
