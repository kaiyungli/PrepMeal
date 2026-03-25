import React, { useState, useEffect } from 'react';

interface LazyFavoriteButtonProps {
  recipeId?: string | number;
  initialIsFavorite?: boolean;
  toggleFavorite?: (recipeId: string | number) => Promise<boolean>;
  isAuthenticated?: boolean;
  onAuthRequired?: () => void;
  className?: string;
}

/**
 * LazyFavoriteButton - renders static placeholder first, then interactive button after first paint
 * This keeps homepage fast while still showing hearts
 */
function LazyFavoriteButton({ recipeId, initialIsFavorite = false, toggleFavorite, isAuthenticated = true, onAuthRequired, className = '' }: LazyFavoriteButtonProps) {
  const [mounted, setMounted] = useState(false);

  // Mount after first paint to not block
  useEffect(() => {
    const timerId = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(timerId);
  }, []);

  if (!mounted) {
    // Static placeholder - renders fast, no interactivity
    return (
      <div className={`absolute top-4 right-4 rounded-full w-9 h-9 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20 z-50 pointer-events-none ${
        initialIsFavorite 
          ? 'bg-rose-500 text-white' 
          : 'bg-white/80 text-rose-400'
      } ${className}`}>
        <svg className="w-5 h-5" fill={initialIsFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.5 10.5 11.25 10.5 11.25S21 15.75 21 8.25z" />
        </svg>
      </div>
    );
  }

  // Dynamic import of FavoriteButton - will load after first paint
  // For now, just render the interactive version
  return (
    <div className={`absolute top-4 right-4 rounded-full w-9 h-9 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20 z-50 hover:scale-110 ${
      initialIsFavorite 
        ? 'bg-rose-500 text-white' 
        : 'bg-white/80 text-rose-400 hover:bg-white'
    } ${className}`}>
      <button
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isAuthenticated && onAuthRequired) {
            onAuthRequired();
            return;
          }
          if (toggleFavorite && recipeId) {
            await toggleFavorite(recipeId);
          }
        }}
        className="w-full h-full flex items-center justify-center"
        aria-label={initialIsFavorite ? "取消收藏" : "收藏"}
      >
        <svg className="w-5 h-5" fill={initialIsFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.5 10.5 11.25 10.5 11.25S21 15.75 21 8.25z" />
        </svg>
      </button>
    </div>
  );
}

export default React.memo(LazyFavoriteButton);