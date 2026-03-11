'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';

export default function PantryHero() {
  const router = useRouter();
  const [input, setInput] = useState('');

  const handleRecommend = () => {
    if (!input.trim()) return;
    const encoded = encodeURIComponent(input);
    router.push(`/recipes?ingredients=${encoded}`);
  };

  const handleGenerate = () => {
    if (!input.trim()) return;
    const encoded = encodeURIComponent(input);
    router.push(`/generate?ingredients=${encoded}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
      {/* Headline */}
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#3A2010]">
        今晚食乜？
      </h1>
      
      {/* Subtext */}
      <p className="text-lg text-[#AA7A50]">
        輸入你雪櫃有咩食材，我幫你推薦食譜
      </p>
      
      {/* Input */}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleRecommend()}
        placeholder="例如: 蛋, 番茄, 雞肉"
        className="w-full border border-[#DDD0B0] rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#9B6035] bg-white"
      />
      
      {/* Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
        <button
          onClick={handleRecommend}
          className="bg-[#9B6035] text-white px-6 py-3 rounded-xl hover:bg-[#7a4a2a] transition font-medium"
        >
          推薦食譜
        </button>
        <button
          onClick={handleGenerate}
          className="bg-[#F8F3E8] text-[#3A2010] px-6 py-3 rounded-xl hover:bg-[#DDD0B0] transition font-medium"
        >
          生成一週餐單
        </button>
      </div>
    </div>
  );
}
