import React from 'react';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import { useRecipeDetailModal } from '@/features/recipes/hooks/useRecipeDetailModal';

/**
 * HomeModalController - Modal orchestration for homepage recipe detail
 * Now uses shared hook for fetch + state logic
 */
interface HomeModalControllerProps {
  selectedRecipe: any;
  onClose: () => void;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onFavoriteClick?: () => void | Promise<void>;
}

function HomeModalController({ 
  selectedRecipe, 
  onClose,
  isFavorite,
  favoriteLoading,
  onFavoriteClick 
}: HomeModalControllerProps) {
  const { recipe, loading, close } = useRecipeDetailModal(selectedRecipe, { onClose });

  return (
    <RecipeDetailModal
      isOpen={!!selectedRecipe}
      onClose={close}
      recipe={recipe}
      loading={loading}
      isFavorite={isFavorite}
      favoriteLoading={favoriteLoading}
      onFavoriteClick={onFavoriteClick}
    />
  );
}

export default React.memo(HomeModalController);
