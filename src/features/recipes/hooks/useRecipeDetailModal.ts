/**
 * useRecipeDetailModal - Shared hook for recipe detail modal
 * 
 * Handles:
 * - Full recipe state
 * - Loading state
 * - Abort controller for fetch cancellation
 * - Fetch via API endpoint
 * - Merge selectedRecipe + fetched detail
 * - Cleanup on close/unmount
 */
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseRecipeDetailModalOptions {
  /** Called when modal should close */
  onClose: () => void;
}

interface UseRecipeDetailModalResult {
  /** The recipe to display (merged selected + full detail) */
  recipe: any;
  /** Whether fetch is in progress */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Close handler - aborts fetch and calls onClose */
  close: () => void;
}

/**
 * Hook for managing recipe detail modal state
 * @param selectedRecipe - The recipe selected by user (may be partial)
 * @param options - Hook options
 * @returns Modal state and handlers
 */
export function useRecipeDetailModal(
  selectedRecipe: any, 
  options: UseRecipeDetailModalOptions
): UseRecipeDetailModalResult {
  const [fullRecipe, setFullRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { onClose } = options;

  // Check if selectedRecipe already has full detail
  const hasFullDetail =
    selectedRecipe &&
    Array.isArray(selectedRecipe.ingredients) &&
    Array.isArray(selectedRecipe.steps);

  // Fetch full detail when needed
  useEffect(() => {
    if (!selectedRecipe) return;

    // Already have full detail - use directly
    if (hasFullDetail) {
      setFullRecipe(selectedRecipe);
      return;
    }

    // Need to fetch full detail - clear stale first
    setFullRecipe(null);
    setError(null);

    if (abortRef.current) {
      abortRef.current.abort();
    }

    abortRef.current = new AbortController();

    setLoading(true);

    // Fetch via API endpoint (client-safe)
    fetch(`/api/recipes/${selectedRecipe.id}`, { signal: abortRef.current.signal })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch recipe detail: HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data?.recipe) {
          // Merge selected recipe with full detail
          setFullRecipe({ ...selectedRecipe, ...data.recipe });
        }
      })
      .catch(err => {
        if (err?.name === 'AbortError') return;
        const errorMsg = err?.message || 'Failed to load recipe detail';
        console.error('[useRecipeDetailModal] fetch failed:', errorMsg);
        setError(errorMsg);
      })
      .finally(() => {
        if (!abortRef.current?.signal.aborted) {
          setLoading(false);
        }
      });
  }, [selectedRecipe, hasFullDetail]);

  // Close handler - aborts fetch and cleans up
  const close = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setLoading(false);
    setFullRecipe(null);
    setError(null);
    onClose();
  }, [onClose]);

  // Merge: use fullRecipe if fetched, otherwise use selectedRecipe
  const recipe = fullRecipe || selectedRecipe;

  return {
    recipe,
    loading,
    error,
    close
  };
}
