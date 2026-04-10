import React, { useState, useEffect, useRef, useCallback } from 'react';
import RecipeDetailModal from '@/components/RecipeDetailModal';

/**
 * HomeModalController - Modal orchestration for homepage recipe detail
 * Uses API endpoint for client-side fetch (not direct DB import)
 */
interface HomeModalControllerProps {
  selectedRecipe: any;
  onClose: () => void;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onFavoriteClick?: () => void | Promise<void>;
}

/**
 * Fetch recipe detail via API (client-safe)
 */
const fetchRecipeDetail = async (recipeId: string | number, signal?: AbortSignal) => {
  const res = await fetch(`/api/recipes/${recipeId}`, { signal });

  if (!res.ok) {
    throw new Error(`Failed to fetch recipe detail: HTTP ${res.status}`);
  }

  const data = await res.json();
  return data?.recipe || null;
};

function HomeModalController({ 
  selectedRecipe, 
  onClose,
  isFavorite,
  favoriteLoading,
  onFavoriteClick 
}: HomeModalControllerProps) {
  const [fullRecipe, setFullRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Check if selectedRecipe already has full detail
  const hasFullDetail =
    Array.isArray(selectedRecipe?.ingredients) &&
    Array.isArray(selectedRecipe?.steps);

  useEffect(() => {
    if (!selectedRecipe) return;

    // Already have full detail - use directly
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
        console.error('[HomeModalController] fetch detail failed:', err);
      })
      .finally(() => {
        if (!abortRef.current?.signal.aborted) {
          setLoading(false);
        }
      });
  }, [selectedRecipe, hasFullDetail]);

  const handleClose = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setLoading(false);
    setFullRecipe(null);
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

export default React.memo(HomeModalController);
