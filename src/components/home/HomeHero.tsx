'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Hero() {
  const router = useRouter();
  const [input, setInput] = useState('');

  const handleSearch = () => {
    if (!input.trim()) return;
    const encoded = encodeURIComponent(input);
    router.push(`/recipes?ingredients=${encoded}`);
  };

  const handleGenerate = () => {
    if (!input.trim()) {
      router.push('/generate');
      return;
    }
    const encoded = encodeURIComponent(input);
    router.push(`/generate?ingredients=${encoded}`);
  };

  return (
    <section className="py-12 bg-[#F8F3E8]">
      <div className="max-w-2xl mx-auto px-4">
        {/* White Card */}
        <div className="bg-white rounded-2xl p-10 shadow-sm border border-[#E5DCC8]">
          <h1 className="text-5xl md:text-6xl font-black text-center text-[#3A2010] mb-4">
            今晚食乜?
          </h1>
          
          <p className="text-xl text-center text-[#AA7A50] mb-8">
            輸入你有嘅食材，我幫你搵啱啱嘅食譜
          </p>

          {/* Input + Button Row */}
          <div className="flex gap-3 max-w-lg mx-auto mb-6">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如：蛋、番茄、雞肉..."
              className="flex-1 px-5 py-3 rounded-xl border-2 border-[#E5DCC8] text-lg focus:outline-none focus:border-[#9B6035]"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-[#9B6035] text-white rounded-xl font-medium hover:bg-[#8B5530] transition-colors"
            >
              搵食譜
            </button>
          </div>

          {/* Secondary CTA */}
          <div className="text-center">
            <button
              onClick={handleGenerate}
              className="text-[#9B6035] font-medium hover:underline"
            >
              或者生成一週餐單 →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
