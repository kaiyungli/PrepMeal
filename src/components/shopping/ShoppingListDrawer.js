import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { formatUnit } from '@/lib/formatters';
import { CATEGORY_ORDER, CATEGORY_LABELS as LABELS, CATEGORY_ICONS } from '@/constants/shoppingCategories';

/**
 * ShoppingListDrawer - Reusable drawer/modal for shopping list
 * 
 * Supports two view modes:
 * - by category (default): 跟種類排
 * - by recipe: 跟菜式排
 */
export default function ShoppingListDrawer({ 
  isOpen, 
  onClose, 
  shoppingList, 
  loading, 
  error,
  onFetch 
}) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState('category'); // 'category' | 'recipe'

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && !shoppingList && !loading && !error && onFetch) {
      onFetch();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Reset view mode when opening new
  useEffect(() => {
    if (isOpen) {
      setViewMode('category');
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const renderCategoryView = (data) => {
    if (!data?.byCategory?.toBuy) return null;
    
    const { pantry, toBuy } = data.byCategory;
    
    return (
      <>
        {/* Pantry */}
        {pantry?.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-green-700 mb-2">雪櫃已有 ({pantry.length})</h3>
            <div className="flex flex-wrap gap-2">
              {pantry.map((item, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-green-100 text-green-800 text-sm rounded-full">{item.name}</span>
              ))}
            </div>
          </div>
        )}
        
        {/* ToBuy by Category */}
        {Object.entries(toBuy).map(([category, items]) => (
          items.length > 0 && (
            <div key={category} className="mb-4">
              <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">
                {CATEGORY_ICONS[category] || ''} {LABELS[category] || '其他'} ({items.length})
              </h3>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2 px-3 bg-[#F8F3E8] rounded-lg">
                    <span>{item.name}</span>
                    <span className="text-sm text-[var(--color-text-muted)]">{item.quantity} {formatUnit(item.unit)}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </>
    );
  };

  const renderRecipeView = (data) => {
    if (!data?.byRecipe || data.byRecipe.length === 0) {
      return <p className="text-center py-8 text-[var(--color-text-muted)]">沒有食材</p>;
    }
    
    return (
      <>
        {data.byRecipe.map((recipe, idx) => (
          <div key={idx} className="mb-6">
            <h3 className="text-sm font-semibold text-[var(--color-primary)] mb-3 pb-2 border-b border-[#E5DCC8]">
              {recipe.recipeName}
            </h3>
            
            {/* Pantry items for this recipe */}
            {recipe.pantry?.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-green-600 mb-2">雪櫃已有</h4>
                <div className="flex flex-wrap gap-1">
                  {recipe.pantry.map((item, i) => (
                    <span key={i} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">{item.name}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* ToBuy items for this recipe */}
            {recipe.toBuy?.length > 0 && (
              <div className="space-y-2">
                {recipe.toBuy.map((item, i) => (
                  <div key={i} className="flex justify-between py-2 px-3 bg-[#F8F3E8] rounded-lg">
                    <span>{item.name}</span>
                    <span className="text-sm text-[var(--color-text-muted)]">{item.quantity} {formatUnit(item.unit)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </>
    );
  };

  return createPortal(
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-50 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5DCC8]">
          <h2 className="text-lg font-semibold">購物清單</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#F4EDDD] rounded-full">✕</button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex border-b border-[#E5DCC8]">
          <button
            onClick={() => setViewMode('category')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              viewMode === 'category' 
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' 
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            跟種類排
          </button>
          <button
            onClick={() => setViewMode('recipe')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              viewMode === 'recipe' 
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' 
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            跟菜式排
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className="text-center py-8 text-[var(--color-text-muted)]">載入中...</p>}
          {error && <p className="text-center py-8 text-red-600">{error}</p>}
          {!loading && !error && shoppingList && (
            viewMode === 'category' 
              ? renderCategoryView(shoppingList)
              : renderRecipeView(shoppingList)
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
