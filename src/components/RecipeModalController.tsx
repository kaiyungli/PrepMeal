// RecipeModalController - isolated modal + detail fetch for recipe pages
import React, { useState, useEffect, useRef, useCallback } from 'react';
import RecipeDetailModal from '@/components/RecipeDetailModal';

// Detail fetch helper - with abort signal support
const fetchRecipeDetail = async (recipeId: string | number, signal?: AbortSignal) => {
  const res = await fetch(`/api/recipes/${recipeId}`, { signal });

  if (!res.ok) {
    throw new Error(`Failed to fetch recipe detail: HTTP ${res.status}`);
  }

  const data = await res.json();
  return data?.recipe || null;
};

interface RecipeModalControllerProps {
  selectedRecipe: any;
  onClose: () => void;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onFavoriteClick?: () => void | Promise<void>;
}

/**
 * RecipeModalController - handles modal + detail fetch
 * Used by both homepage and recipes page for consistent behavior
 */
function RecipeModalController({ selectedRecipe, onClose, isFavorite, favoriteLoading, onFavoriteClick }: RecipeModalControllerProps) {
  const [fullRecipe, setFullRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch full detail when recipe changes
  useEffect(() => {
    if (!selectedRecipe) {
      setFullRecipe(null);
      return;
    }

    // Already have full data?
    const hasFullDetail =
  Array.isArray(selectedRecipe?.ingredients) &&
  Array.isArray(selectedRecipe?.steps);

if (hasFullDetail) {
      setFullRecipe(selectedRecipe);
      return;
    }

    // Need to fetch full detail - clear stale first
    setFullRecipe(null);

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setLoading(true);
    fetchRecipeDetail(selectedRecipe.id, abortRef.current.signal)
      .then(data => {
        if (data) {
          setFullRecipe({ ...selectedRecipe, ...data });
        }
      })
      .catch((err) => {
  if (err?.name === 'AbortError') return;
  console.error('[RecipeModalController] fetch detail failed:', err);
})
      .finally(() => setLoading(false));
  }, [selectedRecipe]);

  const handleClose = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    onClose();
  }, [onClose]);

  const recipe = fullRecipe || selectedRecipe;

  return (
    <RecipeDetailModal
      isOpen={!!selectedRecipe}
      onClose={handleClose}
      recipe={recipe}
      loading={loading}
      isFavorite={isFavorite}
      favoriteLoading={favoriteLoading}
      onFavoriteClick={onFavoriteClick}
    />
  );
}

export default React.memo(RecipeModalController);