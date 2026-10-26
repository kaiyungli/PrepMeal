import ShoppingListSheet from './ShoppingListSheet';
import ShoppingListV2 from './ShoppingListV2';
import { mapShoppingListResponseToViewModel } from '@/features/shopping-list/mappers';
import { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

import { formatUnit, formatQuantity } from '@/lib/formatters';
import { CATEGORY_LABELS as LABELS, CATEGORY_ICONS } from '@/features/shopping-list/constants';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import OptionalIngredientChoices from './OptionalIngredientChoices';

/**
 * ShoppingListDrawer - Reusable drawer/modal for shopping list
 * 
 * Supports two view modes:
 * - by category (default): 跟種類排
 * - by recipe: 跟菜式排
 */
export default function ShoppingListDrawer({ 
  progressState = undefined,
  isOpen, 
  onClose, 
  shoppingList, 
  loading, 
  error,
  onFetch 
}) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const dialogRef = useDialogFocus(mounted && isOpen && !progressState);
  const [viewMode, setViewMode] = useState('category'); // 'category' | 'recipe'

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && !shoppingList && !loading && !error && onFetch) {
      onFetch();
    }
  }, [isOpen, shoppingList, loading, error, onFetch]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !progressState) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, progressState]);

  // Reset view mode when opening new
  useEffect(() => {
    if (isOpen) {
      setViewMode('category');
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const unifiedView = shoppingList && progressState ? mapShoppingListResponseToViewModel({
    ...shoppingList,
    pantry: shoppingList.byCategory?.pantry || [],
    toBuy: Object.entries(shoppingList.byCategory?.toBuy || {}).map(([category, items]) => ({ category, items })),
  }) : null;

  if (progressState) return <ShoppingListSheet isOpen={isOpen} onClose={onClose}>
    {loading ? <p role="status" className="p-6">載入中...</p> : error ? <div className="p-6"><p role="alert" className="text-red-700">{error}</p>{onFetch && <button type="button" className="mt-4 min-h-11 rounded-xl border px-4" onClick={onFetch}>重試</button>}</div> : unifiedView ? <>
      {shoppingList.notice && <p className="px-5 pt-3 text-sm text-[#77573F]">{shoppingList.notice}</p>}
      <ShoppingListV2 view={unifiedView} progress={progressState.progress} onChange={progressState.change} disabled={!progressState.ready} status={progressState.status} />
      {!progressState.ready && <div className="flex shrink-0 gap-2 bg-[#FFFEFB] px-5 pb-4">
        <button type="button" className="min-h-11 rounded-xl border px-4 text-sm" onClick={progressState.reload}>{progressState.conflict ? '重新載入採購進度' : '重試讀取'}</button>
        {!progressState.conflict && progressState.status.includes('未能保存') && <button type="button" className="min-h-11 rounded-xl border px-4 text-sm" onClick={progressState.retrySave}>重試保存</button>}
      </div>}
    </> : <p className="p-6 text-sm">正在讀取購物清單…</p>}
  </ShoppingListSheet>;

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
                    <span className="text-sm text-[var(--color-text-muted)]">{formatQuantity(item.quantity, item.unit)} {formatUnit(item.unit)}</span>
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
                    <span className="text-sm text-[var(--color-text-muted)]">{formatQuantity(item.quantity, item.unit)} {formatUnit(item.unit)}</span>
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
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-50 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5DCC8]">
          <h2 id={titleId} className="text-lg font-semibold">購物清單</h2>
          <button type="button" aria-label="關閉購物清單" onClick={onClose} className="p-2 hover:bg-[#F4EDDD] rounded-full">✕</button>
        </div>

        {/* View Mode Toggle */}
        {!progressState && <div className="flex border-b border-[#E5DCC8]">
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

        }
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!progressState && <OptionalIngredientChoices groups={shoppingList?.optionalIngredients} />}
          {!progressState && shoppingList?.dietaryNotes?.map(note => <p key={note} className="mb-3 text-sm">{note}</p>)}
          {loading && <p className="text-center py-8 text-[var(--color-text-muted)]">載入中...</p>}
          {!loading && error && (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              {onFetch && (
                <button
                  onClick={onFetch}
                  className="mt-4 px-4 py-2 text-sm font-medium rounded-lg border border-[#E5DCC8] hover:bg-[#F4EDDD]"
                >
                  重試
                </button>
              )}
            </div>
          )}
          {!loading && !error && shoppingList?.notice && (
            <p className={shoppingList.noUsableRecipes
              ? 'text-center py-8 text-[var(--color-text-muted)]'
              : 'mb-4 px-3 py-2 text-sm text-[#9B6035] bg-[#FAF3E6] rounded-lg'}>
              {shoppingList.notice}
            </p>
          )}
          {!progressState && !loading && !error && shoppingList && !shoppingList.noUsableRecipes && (
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
