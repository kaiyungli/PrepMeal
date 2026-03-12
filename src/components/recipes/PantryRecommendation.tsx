'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { recommendRecipes, type Recipe, type Recommendation } from '@/lib/ingredientMatcher';

interface PantryRecommendationProps {
  recipes: Recipe[];
  pantryIngredients?: string[];
}

export default function PantryRecommendation({ recipes, pantryIngredients = [] }: PantryRecommendationProps) {
  // Use pantryIngredients if provided, otherwise use local input
  const [localInput, setLocalInput] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // Use pantry from props if available, otherwise from local input
  const effectiveIngredients = pantryIngredients.length > 0 
    ? pantryIngredients 
    : localInput.split(',').map(i => i.trim()).filter(Boolean);

  const handleSearch = () => {
    console.log('[PANTRY] handleSearch called, effectiveIngredients:', effectiveIngredients);
    console.log('[PANTRY] recipes count:', recipes?.length);
    
    if (effectiveIngredients.length === 0) {
      setRecommendations([]);
      return;
    }
    
    const results = recommendRecipes(effectiveIngredients, recipes);
    console.log('[PANTRY] recommendRecipes results:', results.length);
    if (results.length > 0) {
      console.log('[PANTRY] top result:', results[0].recipe.name, 'score:', results[0].matchScore);
    }
    setRecommendations(results);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Auto-search when pantryIngredients changes
  if (pantryIngredients.length > 0) {
    const results = recommendRecipes(pantryIngredients, recipes);
    if (recommendations.length !== results.length) {
      setRecommendations(results);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-bold text-[#3A2010] mb-3">🥬 入廚房有咩餸?</h3>
      <p className="text-sm text-[#AA7A50] mb-3">輸入你既食材，我地推薦啱既食譜</p>
      
      {pantryIngredients.length === 0 && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例如: 蛋, 番茄, 雞肉"
            className="flex-1 px-4 py-2 border border-[#DDD0B0] rounded-lg focus:outline-none focus:border-[#9B6035]"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-[#9B6035] text-white rounded-lg font-medium hover:bg-[#7a4a2a] transition"
          >
            搜尋
          </button>
        </div>
      )}
      
      {effectiveIngredients.length > 0 && (
        <p className="text-sm text-[#AA7A50] mb-3">
          你有: {effectiveIngredients.join('、')}
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
      
      {effectiveIngredients.length > 0 && recommendations.length === 0 && (
        <p className="text-sm text-[#AA7A50]">沒有找到匹配既食譜</p>
      )}
    </div>
  );
}
