'use client';

import { useState, useCallback } from 'react';
import HomeRecipeGrid from '@/components/home/HomeRecipeGrid';
import HomeModalController from '@/components/home/HomeModalController';

interface HomeRecipesSectionProps {
  recipes: any[];
  isFavorite?: (recipeId: string | number) => boolean;
  isPending?: (recipeId: string | number) => boolean;
  onFavoriteClick?: (recipeId: string | number) => void | Promise<void>;
  loadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

/**
 * HomeRecipesSection - recipe grid + popup modal
 */
export default function HomeRecipesSection({ 
  recipes,
  isFavorite,
  isPending,
  onFavoriteClick,
  loadMore,
  hasMore,
  loadingMore,
}: HomeRecipesSectionProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  const handleRecipeClick = useCallback((recipe: any) => {
    setSelectedRecipe({ ...recipe });
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

  const modalIsFavorite = selectedRecipe && isFavorite ? isFavorite(selectedRecipe.id) : false;
  const modalIsPending = selectedRecipe && isPending ? isPending(selectedRecipe.id) : false;
  const handleModalFavoriteClick = useCallback(() => {
    if (selectedRecipe?.id && onFavoriteClick) {
      onFavoriteClick(selectedRecipe.id);
    }
  }, [selectedRecipe, onFavoriteClick]);

  return (
    <section id="recipes" className="pt-8 pb-24 bg-[#F8F3E8]">
      <div>
        <HomeRecipeGrid
          recipes={recipes}
          onRecipeClick={handleRecipeClick}
          isFavorite={isFavorite}
          isPending={isPending}
          onFavoriteClick={onFavoriteClick}
          loadMore={loadMore}
          hasMore={hasMore}
          loadingMore={loadingMore}
        />
      </div>

      <HomeModalController
        selectedRecipe={selectedRecipe}
        onClose={handleCloseModal}
        isFavorite={modalIsFavorite}
        favoriteLoading={modalIsPending}
        onFavoriteClick={handleModalFavoriteClick}
      />
    </section>
  );
}