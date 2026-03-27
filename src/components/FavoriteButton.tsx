// FavoriteButton - simple toggle button, NOT inside a Link
import React, { useState, useCallback } from 'react';

interface FavoriteButtonProps {
  recipeId?: string | number;
  isFavorite?: boolean;
  onToggle?: (recipeId: string | number) => Promise<boolean> | void;
  className?: string;
}

/**
 * FavoriteButton - local optimistic visual state for instant UI
 * - Position: absolute, outside Link
 * - onClick: just calls onToggle, no need for stopPropagation
 * - Shows different UI for isFavorite: true vs false
 */
function FavoriteButton({ 
  recipeId, 
  isFavorite = false, 
  onToggle,
  className = '' 
}: FavoriteButtonProps) {
  const [localFav, setLocalFav] = useState(isFavorite);

  // Sync with prop when prop changes
  React.useEffect(() => {
    setLocalFav(isFavorite);
  }, [isFavorite]);

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!onToggle || !recipeId) return;
    
    const previousValue = localFav;
    const nextValue = !localFav;
    setLocalFav(nextValue);

    try {
      const result = onToggle(recipeId);
      
      if (result && typeof result.then === 'function') {
        const success = await result;
        if (!success) {
          setLocalFav(previousValue);
        }
      }
    } catch (err) {
      setLocalFav(previousValue);
    }
  }, [localFav, onToggle, recipeId]);

  // Different UI based on isFavorite state
  const isFav = localFav;
  
  return (
    <button 
      onClick={handleClick}
      className={`rounded-full w-9 h-9 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20 z-50 hover:scale-110 transition-transform ${
        isFav 
          ? 'bg-rose-500 text-white' 
          : 'bg-white/80 text-rose-400 hover:bg-white'
      } ${className}`}
      aria-label={isFav ? "取消收藏" : "收藏"}
    >
      <svg 
        className="w-5 h-5" 
        fill={isFav ? "currentColor" : "none"} 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.5 10.5 11.25 10.5 11.25S21 15.75 21 8.25z" />
      </svg>
    </button>
  );
}

export default React.memo(FavoriteButton);