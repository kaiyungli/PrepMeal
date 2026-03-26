// FavoriteButton - leaf component with true local optimistic visual state
import React, { useState, useCallback } from 'react';

interface FavoriteButtonProps {
  recipeId?: string | number;
  isFavorite?: boolean;
  onToggle?: (recipeId: string | number) => Promise<boolean> | void;
  className?: string;
}

/**
 * FavoriteButton - local optimistic visual state for instant UI
 * - Shows local visual immediately on click
 * - Calls onToggle which returns Promise
 * - On failure: rolls back visual state
 * - No permanent local truth - syncs with prop on mount
 */
function FavoriteButton({ 
  recipeId, 
  isFavorite = false, 
  onToggle,
  className = '' 
}: FavoriteButtonProps) {
  const [localFav, setLocalFav] = useState(isFavorite);

  // Sync with prop when prop changes (not during interaction)
  React.useEffect(() => {
    setLocalFav(isFavorite);
  }, [isFavorite]);

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!onToggle || !recipeId) return;
    
    // Instant visual feedback - toggle locally
    const previousValue = localFav;
    const nextValue = !localFav;
    setLocalFav(nextValue);

    try {
      // Call onToggle - could be async
      const result = onToggle(recipeId);
      
      // If it's a Promise, handle result
      if (result && typeof result.then === 'function') {
        const success = await result;
        if (!success) {
          // Rollback on failure
          setLocalFav(previousValue);
        }
      }
      // If not a Promise, assume success (fire and forget)
    } catch (err) {
      // Rollback on error
      setLocalFav(previousValue);
    }
  }, [localFav, onToggle, recipeId]);

  return (
    <button 
      onClick={handleClick}
      className={`absolute top-4 right-4 rounded-full w-9 h-9 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20 z-50 hover:scale-110 ${
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

export default React.memo(FavoriteButton);