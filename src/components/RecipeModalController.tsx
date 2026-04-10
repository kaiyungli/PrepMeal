import React from 'react';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import { useRecipeDetailModal } from '@/features/recipes/hooks/useRecipeDetailModal';

/**
 * RecipeModalController - Modal orchestration for recipe detail
 * Now uses shared hook for fetch + state logic
 */
interface RecipeModalControllerProps {
  selectedRecipe: any;
  onClose: () => void;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onFavoriteClick?: () => void | Promise<void>;
}

function RecipeModalController({ 
  selectedRecipe, 
  onClose,
  isFavorite,
  favoriteLoading,
  onFavoriteClick 
}: RecipeModalControllerProps) {
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

export default React.memo(RecipeModalController);
