// FavoriteButton - leaf component, instant UI
import React, { useState, useCallback } from 'react';

interface FavoriteButtonProps {
  recipeId?: string | number;
  isFavorite?: boolean;
  onToggle?: (recipeId: string | number) => void;
  className?: string;
}

/**
 * FavoriteButton - local optimistic state for instant UI
 * Prop isFavorite comes from canonical useFavorites hook
 * Local state only for visual instant feedback, not source of truth
 */
function FavoriteButton({ 
  recipeId, 
  isFavorite = false, 
  onToggle,
  className = '' 
}: FavoriteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading || !onToggle || !recipeId) return;
    
    setIsLoading(true);
    onToggle(recipeId);
    setIsLoading(false);
  }, [onToggle, recipeId, isLoading]);

  return (
    <button 
      onClick={handleClick}
      disabled={isLoading}
      className={`absolute top-4 right-4 rounded-full w-9 h-9 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20 z-50 hover:scale-110 disabled:opacity-50 ${
        isFavorite 
          ? 'bg-rose-500 text-white' 
          : 'bg-white/80 text-rose-400 hover:bg-white'
      } ${className}`}
      aria-label={isFavorite ? "取消收藏" : "收藏"}
    >
      <svg className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.5 10.5 11.25 10.5 11.25S21 15.75 21 8.25z" />
      </svg>
    </button>
  );
}

export default React.memo(FavoriteButton);