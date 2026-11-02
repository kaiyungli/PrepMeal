import { useState, useEffect, useRef, useCallback } from 'react';
import type { RecipeDetailContentProps } from '@/components/RecipeDetailContent';
import { getCachedRecipeDetail, setCachedRecipeDetail, getInflightRecipeDetail } from '../services/recipeDetailClientCache';

type DetailRecipe = NonNullable<RecipeDetailContentProps['recipe']>;
type State = { selection: DetailRecipe | null; full: DetailRecipe | null; loading: boolean; error: string | null };
function initialState(selection: DetailRecipe | null): State {
  const cached = selection && getCachedRecipeDetail(selection.id);
  const full = cached ? { ...selection, ...cached }
    : selection && Array.isArray(selection.ingredients) && Array.isArray(selection.steps) ? selection : null;
  return { selection, full, loading: !!selection && !full, error: null };
}

export function useRecipeDetailModal(selectedRecipe: DetailRecipe | null, { onClose }: { onClose: () => void }) {
  const [state, setState] = useState(() => initialState(selectedRecipe));
  // Scope state to this exact opening, including A → B → A transitions. Reset
  // before committing a different selection rather than from a sync effect.
  if (state.selection !== selectedRecipe) setState(initialState(selectedRecipe));
  const cancelRequestRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const cancel = () => { active = false; controller.abort(); };
    const cleanup = () => {
      cancel();
      if (cancelRequestRef.current === cancel) cancelRequestRef.current = null;
    };
    cancelRequestRef.current = cancel;
    if (!selectedRecipe) return cleanup;

    const current = () => active && !controller.signal.aborted;
    const ready = initialState(selectedRecipe).full;
    if (ready) {
      // A shared cache may have completed between render and effect setup.
      Promise.resolve(ready).then(full => {
        if (current()) setState({ selection: selectedRecipe, full, loading: false, error: null });
      });
      return cleanup;
    }
    const shared = getInflightRecipeDetail(selectedRecipe.id);
    const work = shared || fetch(`/api/recipes/${selectedRecipe.id}`, {
      signal: controller.signal,
      headers: { 'x-perf-trace-id': `${selectedRecipe.id}-${Date.now()}` },
    }).then(res => {
      if (!res.ok) throw new Error(`Failed to fetch recipe detail: HTTP ${res.status}`);
      return res.json();
    }).then(data => data?.recipe as DetailRecipe | null);

    work.then(recipe => {
      if (!current()) return;
      const full = recipe ? { ...selectedRecipe, ...recipe } : null;
      // Shared prefetch owns its cache. Cancelled direct fetches must never
      // populate it, even if a queued response ignores AbortController.
      if (full && !shared) setCachedRecipeDetail(selectedRecipe.id, full);
      setState({ selection: selectedRecipe, full, loading: false, error: null });
    }).catch(error => {
      if (!current()) return;
      setState({ selection: selectedRecipe, full: null, loading: false,
        error: error instanceof Error ? error.message : 'Failed to load recipe detail' });
    });
    return cleanup;
  }, [selectedRecipe]);

  const close = useCallback(() => {
    cancelRequestRef.current?.();
    cancelRequestRef.current = null;
    setState({ selection: selectedRecipe, full: null, loading: false, error: null });
    onClose();
  }, [onClose, selectedRecipe]);

  const visible = state.selection === selectedRecipe ? state : initialState(selectedRecipe);
  return { recipe: visible.full || selectedRecipe, loading: visible.loading, error: visible.error, close };
}
