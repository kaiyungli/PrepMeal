'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { recommendRecipes, type Recipe, type Recommendation } from '@/lib/ingredientMatcher';

interface PantryRecommendationProps {
  recipes: Recipe[];
  pantryIngredients?: string[];
}

export default function PantryRecommendation({ recipes, pantryIngredients = [] }: PantryRecommendationProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // Auto-search when pantryIngredients changes
  useEffect(() => {
    if (pantryIngredients.length > 0 && recipes.length > 0) {
      const results = recommendRecipes(pantryIngredients, recipes);
      setRecommendations(results);
    } else {
      setRecommendations([]);
    }
  }, [pantryIngredients, recipes]);

  // Don't show section if no pantry ingredients
  if (pantryIngredients.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-bold text-[#3A2010] mb-3">🍳 根據你既食材推薦</h3>
      <p className="text-sm text-[#AA7A50] mb-4">
        你既食材: {pantryIngredients.join('、')} - 呢啲食譜啱你！
      </p>
      
      {recommendations.length > 0 && (
        <div>
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
      
      {recommendations.length === 0 && (
        <p className="text-sm text-[#AA7A50]">暫時未有匹配既食譜，試下輸入其他食材</p>
      )}
    </div>
  );
}
