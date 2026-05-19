// Track recipe views for popular sorting
import { useRef } from 'react';
let globalTrackView: ((id: string) => void) | null = null;

// Initialize global tracker
if (typeof window !== 'undefined' && !globalTrackView) {
  const trackedRecipes = new Set<string>();
  
  globalTrackView = async (recipeId: string) => {
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
  const trackedRef = useRef(new Set<string>());

  const track = (recipeId: string | number) => {
    const id = String(recipeId);
    if (globalTrackView && !trackedRef.current.has(id)) {
      trackedRef.current.add(id);
      globalTrackView(id);
    }
  };

  return { trackView: track };
}

export default useRecipeViewTracker;
