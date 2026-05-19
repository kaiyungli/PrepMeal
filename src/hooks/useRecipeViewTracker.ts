// Track recipe views for popular sorting
import { useRef } from 'react';

let globalTrackView: ((id: number) => void) | null = null;

// Initialize tracking on first use
if (typeof window !== 'undefined' && !globalTrackView) {
  const trackedRecipes = new Set<number>();
  globalTrackView = async (recipeId: number) => {
    if (!recipeId || trackedRecipes.has(recipeId)) return;
    trackedRecipes.add(recipeId);
    try {
      await fetch(`/api/recipes/${recipeId}/track-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('track-view failed:', err);
    }
  };
}

export function useRecipeViewTracker() {
  const trackedRef = useRef(new Set<number>());

  const track = (recipeId: number) => {
    if (globalTrackView && !trackedRef.current.has(recipeId)) {
      trackedRef.current.add(recipeId);
      globalTrackView(recipeId);
    }
  };

  return { trackView: track };
}

export default useRecipeViewTracker;
