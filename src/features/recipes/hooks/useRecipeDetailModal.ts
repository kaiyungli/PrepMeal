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
import { getCachedRecipeDetail, setCachedRecipeDetail, getInflightRecipeDetail } from '../services/recipeDetailClientCache';

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

    // Check in-memory cache first
    const cachedDetail = getCachedRecipeDetail(selectedRecipe.id);

    if (cachedDetail) {
      console.log('[recipe-modal] detail_cache_hit', {
        recipeId: selectedRecipe.id,
        ingredientCount: cachedDetail.ingredients?.length || 0,
        stepCount: cachedDetail.steps?.length || 0
      });

      setFullRecipe({ ...selectedRecipe, ...cachedDetail });
      return;
    }
    // Cache miss - need to fetch
    console.log('[recipe-modal] detail_cache_miss', {
      recipeId: selectedRecipe.id
    });

    // Check if prefetch is already inflight
    const inflightDetail = getInflightRecipeDetail(selectedRecipe.id);

    if (inflightDetail) {
      const traceId = `${selectedRecipe.id}-modal-inflight-${Date.now()}`;
      const inflightStart = Date.now();

      console.log('[recipe-modal] inflight_reuse_start', {
        traceId,
        recipeId: selectedRecipe.id
      });

      setLoading(true);
      setError(null);

      inflightDetail
        .then(recipe => {
          console.log('[recipe-modal] inflight_reuse_done', {
            traceId,
            recipeId: selectedRecipe.id,
            duration_ms: Date.now() - inflightStart,
            hasRecipe: Boolean(recipe),
            ingredientCount: recipe?.ingredients?.length || 0,
            stepCount: recipe?.steps?.length || 0
          });

          if (recipe) {
            setFullRecipe({ ...selectedRecipe, ...recipe });
          }
        })
        .catch(err => {
          const errorMsg = err?.message || 'Failed to load recipe detail';
          console.error('[recipe-modal] inflight_reuse_failed', {
            traceId,
            recipeId: selectedRecipe.id,
            message: errorMsg
          });
          setError(errorMsg);
        })
        .finally(() => {
          setLoading(false);
        });

      return;
    }

    // Already have full detail - use directly
    if (hasFullDetail) {
      console.log('[recipe-modal] full_detail_cache_hit', {
        recipeId: selectedRecipe.id,
        ingredientCount: selectedRecipe.ingredients?.length || 0,
        stepCount: selectedRecipe.steps?.length || 0
      });
      setFullRecipe(selectedRecipe);
      return;
    }

    // Need to fetch full detail
    const traceId = `${selectedRecipe.id}-${Date.now()}`;
    const fetchStart = Date.now();

    console.log('[recipe-modal] fetch_start', {
      traceId,
      recipeId: selectedRecipe.id,
      hasFullDetail
    });

    // Clear stale first
    setFullRecipe(null);
    setError(null);

    if (abortRef.current) {
      abortRef.current.abort();
    }

    abortRef.current = new AbortController();

    setLoading(true);

    // Fetch via API endpoint (client-safe)
    fetch(`/api/recipes/${selectedRecipe.id}`, { 
      signal: abortRef.current.signal,
      headers: {
        'x-perf-trace-id': traceId
      }
    })
      .then(res => {
        console.log('[recipe-modal] response_received', {
          traceId,
          recipeId: selectedRecipe.id,
          duration_ms: Date.now() - fetchStart,
          status: res.status
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch recipe detail: HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('[recipe-modal] json_parsed', {
          traceId,
          recipeId: selectedRecipe.id,
          duration_ms: Date.now() - fetchStart,
          hasRecipe: Boolean(data?.recipe),
          ingredientCount: data?.recipe?.ingredients?.length || 0,
          stepCount: data?.recipe?.steps?.length || 0
        });

        if (data?.recipe) {
          // Merge selected recipe with full detail
          const mergedRecipe = { ...selectedRecipe, ...data.recipe };
          
          // Cache for future modal opens
          setCachedRecipeDetail(selectedRecipe.id, mergedRecipe);
          
          setFullRecipe(mergedRecipe);
          
          console.log('[recipe-modal] render_ready', {
            traceId,
            recipeId: selectedRecipe.id,
            duration_ms: Date.now() - fetchStart
          });
        }
      })
      .catch(err => {
        if (err?.name === 'AbortError') {
          console.log('[recipe-modal] fetch_aborted', {
            traceId,
            recipeId: selectedRecipe.id
          });
          return;
        }
        
        const errorMsg = err?.message || 'Failed to load recipe detail';
        console.error('[recipe-modal] fetch_failed', {
          traceId,
          recipeId: selectedRecipe.id,
          message: errorMsg
        });
        setError(errorMsg);
      })
      .finally(() => {
        if (!abortRef.current?.signal.aborted) {
          setLoading(false);
        }
      });
  }, [selectedRecipe?.id, hasFullDetail]);

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