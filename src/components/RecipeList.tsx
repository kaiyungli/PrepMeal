import type { ComponentProps } from 'react';
type CardRecipe = ComponentProps<typeof RecipeCard>['recipe'] & { id: string | number };
import React from 'react';
import RecipeCard from '@/components/RecipeCard';
import { prefetchRecipeDetail } from '@/features/recipes/services/recipeDetailClientCache';

// The grid is 1 column on phones and up to 4 on desktop: the first card is the
// likely LCP image, the first row loads eagerly, everything below stays lazy.
const EAGER_IMAGE_COUNT = 4;
const imageLoadingFor = (index: number) => index === 0 ? 'high' as const : index < EAGER_IMAGE_COUNT ? 'eager' as const : undefined;

interface RecipeListProps {
  recipes: CardRecipe[];
  onRecipeClick?: (recipe: CardRecipe) => void;
  isFavorite?: (recipeId: string | number) => boolean;
  isPending?: (recipeId: string | number) => boolean;
  onFavoriteClick?: (recipeId: string | number) => void | Promise<void>;
  isAuthenticated?: boolean;
  emptyMessage?: string;
  emptyLink?: string;
}

function RecipeList({
  recipes,
  onRecipeClick,
  isFavorite,
  isPending,
  onFavoriteClick,
  isAuthenticated,
  emptyMessage = '暫時未有食譜',
  emptyLink,
}: RecipeListProps) {
  if (!recipes || recipes.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-[#7A746B] mb-4">{emptyMessage}</p>
        {emptyLink && (
          <a href={emptyLink} className="text-[#9B6035] font-medium hover:underline">
            去搵啱你嘅食譜 →
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {recipes.map((recipe, index) => {
        const handlePrefetch = () => {
          if (recipe?.id) {
            prefetchRecipeDetail(recipe.id);
          }
        };

        return (
          <div
            key={recipe.id}
            onMouseEnter={handlePrefetch}
            onFocus={handlePrefetch}
            onTouchStart={handlePrefetch}
          >
            <RecipeCard
              recipe={recipe}
              onClick={onRecipeClick ? () => onRecipeClick(recipe) : undefined}
              isFavorite={typeof isFavorite === 'function' ? isFavorite(recipe.id) : undefined}
              favoriteLoading={typeof isPending === 'function' ? isPending(recipe.id) : undefined}
              onFavoriteClick={typeof onFavoriteClick === 'function' ? () => onFavoriteClick(recipe.id) : undefined}
              isAuthenticated={isAuthenticated}
              imageLoading={imageLoadingFor(index)}
            />
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(RecipeList);