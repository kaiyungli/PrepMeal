'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { recommendRecipes, type Recipe, type Recommendation } from '@/lib/ingredientMatcher';

interface PantryRecommendationProps {
  recipes: Recipe[];
}

export default function PantryRecommendation({ recipes }: PantryRecommendationProps) {
  const [input, setInput] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const handleSearch = () => {
    if (!input.trim()) {
      setRecommendations([]);
      return;
    }
    
    const ingredients = input.split(',').map(i => i.trim()).filter(Boolean);
    const results = recommendRecipes(ingredients, recipes);
    setRecommendations(results);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-bold text-[#3A2010] mb-3">🥬 入廚房有咩餸?</h3>
      <p className="text-sm text-[#AA7A50] mb-3">輸入你既食材，我地推薦啱既食譜</p>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例如: 蛋, 番茄, 雞肉"
          className="flex-1 px-4 py-2 border border-[#DDD0B0] rounded-lg focus:outline-none focus:border-[#9B6035]"
        />
        <button
          onClick={handleSearch}
          className="px-6 py-2 bg-[#9B6035] text-white rounded-lg font-medium hover:bg-[#7a4a2a] transition-colors"
        >
          搜尋
        </button>
      </div>
      
      {input && (
        <p className="text-sm text-[#AA7A50] mb-3">
          你有: {input}
        </p>
      )}
      
      {recommendations.length > 0 && (
        <div>
          <h4 className="font-semibold text-[#3A2010] mb-3">推薦食譜</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {recommendations.map(({ recipe, matchScore, matchedIngredients }) => (
              <Link 
                key={recipe.id}
                href={`/recipes/${recipe.slug || recipe.id}`}
                className="bg-[#F8F3E8] rounded-lg p-3 hover:shadow-md transition-shadow block"
              >
                <div className="h-16 flex items-center justify-center bg-gray-200 rounded-lg mb-2">
                  {recipe.image_url ? (
                    <Image src={recipe.image_url} alt={recipe.name} width={64} height={64} className="object-cover rounded-lg" />
                  ) : (
                    <span className="text-2xl">🍳</span>
                  )}
                </div>
                <div className="text-sm font-medium text-[#3A2010] truncate">{recipe.name}</div>
                <div className="text-xs text-[#AA7A50]">
                  {matchedIngredients.length} 食材匹配
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {input && recommendations.length === 0 && (
        <p className="text-sm text-[#AA7A50]">沒有找到匹配既食譜</p>
      )}
    </div>
  );
}
