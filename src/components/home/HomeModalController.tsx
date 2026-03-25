import React, { useCallback } from 'react';
import RecipeDetailModal from '@/components/RecipeDetailModal';

interface HomeModalControllerProps {
  selectedRecipe: any;
  modalLoading: boolean;
  favoriteSet: Set<string>;
  toggleFavorite: (id: string | number) => Promise<boolean>;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  onClose: () => void;
}

function HomeModalController({ selectedRecipe, modalLoading, favoriteSet, toggleFavorite, isAuthenticated, onAuthRequired, onClose }: HomeModalControllerProps) {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <RecipeDetailModal
      isOpen={!!selectedRecipe}
      onClose={handleClose}
      recipe={selectedRecipe}
      loading={modalLoading}
      isFavorite={selectedRecipe ? favoriteSet.has(String(selectedRecipe.id)) : false}
      toggleFavorite={toggleFavorite}
      isAuthenticated={isAuthenticated}
      onAuthRequired={onAuthRequired}
    />
  );
}

export default React.memo(HomeModalController);