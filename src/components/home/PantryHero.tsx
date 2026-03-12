'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import PantryChipInput from './PantryChipInput';

export default function PantryHero() {
  const router = useRouter();
  const [chips, setChips] = useState<string[]>([]);

  const handleRecommend = () => {
    if (chips.length === 0) return;
    const encoded = encodeURIComponent(chips.join(','));
    router.push(`/recipes?ingredients=${encoded}`);
  };

  const handleGenerate = () => {
    if (chips.length === 0) return;
    const encoded = encodeURIComponent(chips.join(','));
    router.push(`/generate?ingredients=${encoded}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
      {/* Headline */}
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#3A2010]">
        今晚食乜？
      </h1>
      
      {/* Subtext */}
      <p className="text-gray-500 text-lg">
        輸入你雪櫃有咩食材，我幫你推薦食譜
      </p>
      
      {/* Chip Input */}
      <div className="max-w-2xl mx-auto">
        <PantryChipInput
          value={chips}
          onChange={setChips}
          placeholder="輸入食材，按 Enter 或 , 加入"
        />
      </div>
      
      {/* Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
        <button
          onClick={handleRecommend}
          disabled={chips.length === 0}
          className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          推薦食譜
        </button>
        <button
          onClick={handleGenerate}
          disabled={chips.length === 0}
          className="bg-gray-100 text-gray-900 px-6 py-3 rounded-xl hover:bg-gray-200 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          生成一週餐單
        </button>
      </div>
    </div>
  );
}
