import React, { useState, useCallback, useEffect } from 'react';

interface FavoriteButtonProps {
  recipeId?: string | number;
  initialIsFavorite?: boolean;
  toggleFavorite: (recipeId: string | number) => Promise<boolean>;
  isAuthenticated?: boolean;
  onAuthRequired?: () => void;
  className?: string;
}

/**
 * FavoriteButton - isolated favorite toggle with local state for instant UI
 * - Wrapped in React.memo to prevent unnecessary re-renders
 * - Updates UI immediately on click (optimistic)
 * - Rolls back on API failure
 * - Syncs with global state in background
 */
function FavoriteButton({ 
  recipeId, 
  initialIsFavorite = false, 
  toggleFavorite, 
  isAuthenticated = true,
  onAuthRequired,
  className = '' 
}: FavoriteButtonProps) {
  const [localFav, setLocalFav] = useState(initialIsFavorite);
  const [isLoading, setIsLoading] = useState(false);

  // Sync local state with prop when it changes (but not while request in flight)
  useEffect(() => {
    if (!isLoading) {
      setLocalFav(initialIsFavorite);
    }
  }, [initialIsFavorite, isLoading]);

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent double-click
    if (isLoading || !recipeId) return;
    
    // Check authentication
    if (!isAuthenticated && onAuthRequired) {
      onAuthRequired();
      return;
    }
    
    // Immediate UI update (optimistic)
    const previousState = localFav;
    setLocalFav(!localFav);
    setIsLoading(true);

    try {
      const success = await toggleFavorite(recipeId);
      
      if (!success) {
        // Rollback on failure
        setLocalFav(previousState);
      }
    } catch (err) {
      // Rollback on error
      setLocalFav(previousState);
    } finally {
      setIsLoading(false);
    }
  }, [recipeId, toggleFavorite, isAuthenticated, onAuthRequired, localFav, isLoading]);

  return (
    <button 
      onClick={handleClick}
      disabled={isLoading}
      className={`absolute top-4 right-4 rounded-full w-9 h-9 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20 z-50 pointer-events-auto hover:scale-110 disabled:opacity-50 ${
        localFav 
          ? 'bg-rose-500 text-white' 
          : 'bg-white/80 text-rose-400 hover:bg-white'
      } ${className}`}
      aria-label={localFav ? "取消收藏" : "收藏"}
    >
      <svg className="w-5 h-5" fill={localFav ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.5 10.5 11.25 10.5 11.25S21 15.75 21 8.25z" />
      </svg>
    </button>
  );
}

// Wrap with memo to prevent re-renders from parent
export default React.memo(FavoriteButton);