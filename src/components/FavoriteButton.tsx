// FavoriteButton - pure UI component for favorite toggle
import React, { useCallback } from 'react';

interface FavoriteButtonProps {
  /** Whether the recipe is currently favorited */
  active?: boolean;
  /** Whether a toggle operation is in progress */
  loading?: boolean;
  /** Callback when button is clicked */
  onClick?: () => void | Promise<void>;
  /** Additional CSS classes */
  className?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
}

/**
 * FavoriteButton - pure presentational component
 * - Renders based on props only
 * - No local state, no optimistic logic
 * - Calls onClick when pressed
 * - Visually reflects active/loading/disabled state
 */
function FavoriteButton({ 
  active = false, 
  loading = false,
  onClick,
  className = '',
  disabled = false
}: FavoriteButtonProps) {
  // Handle click with event protection
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Prevent default and stop propagation to avoid parent click handlers
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
    
    // Don't call onClick if disabled or loading
    if (disabled || loading || !onClick) {
      return;
    }
    
    onClick();
  }, [disabled, loading, onClick]);

  // Compute button state
  const isDisabled = disabled || loading;

  return (
    <button 
      onClick={handleClick}
      disabled={isDisabled}
      onTouchStart={() => {}}
      style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
      className={`
        rounded-full 
        flex 
        items-center 
        justify-center 
        shadow-lg 
        backdrop-blur-sm 
        border 
        border-white/20 
        z-50 
        hover:scale-110 
        transition-transform
        ${active ? 'bg-rose-500 text-white' : 'bg-white/80 text-rose-400 hover:bg-white'}
        cursor-pointer ${isDisabled ? 'cursor-not-allowed' : ''}
        ${className}
      `}
      aria-label={active ? "取消收藏" : "收藏"}
      aria-busy={loading}
      type="button"
    >
      <svg 
        className="w-5 h-5" 
        fill={active ? "currentColor" : "none"} 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={2}
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.5 10.5 11.25 10.5 11.25S21 15.75 21 8.25z" 
        />
      </svg>
    </button>
  );
}

export default React.memo(FavoriteButton);