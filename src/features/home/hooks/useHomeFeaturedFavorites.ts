import { useCallback, useEffect } from 'react';
import { useUserState } from '@/hooks/useUserState';
import { useToast } from '@/components/ui/Toast';

/** Reuse the account/epoch-scoped favorites store, never a homepage copy. */
export function useHomeFeaturedFavorites() {
  const { isAuthenticated, authLoading, isFavorite, isPending, toggleFavorite,
    favoritesLoading, favoritesError, favoritesMutationError } = useUserState();
  const { toast, showToast } = useToast();
  useEffect(() => {
    if (favoritesMutationError) showToast(favoritesMutationError, 'error');
  }, [favoritesMutationError, showToast]);
  const onFavoriteClick = useCallback((id: string | number) => {
    if (authLoading) { showToast('正在確認登入狀態，請稍後再試', 'info'); return; }
    if (!isAuthenticated) { showToast('請先登入以收藏食譜', 'info'); return; }
    if (favoritesLoading) { showToast('收藏仍在載入，請稍後再試', 'info'); return; }
    if (favoritesError) { showToast('收藏載入失敗，請重新整理後再試', 'error'); return; }
    return toggleFavorite?.(String(id));
  }, [authLoading, isAuthenticated, favoritesLoading, favoritesError, toggleFavorite, showToast]);
  return { isFavorite, isPending, onFavoriteClick, toast };
}
