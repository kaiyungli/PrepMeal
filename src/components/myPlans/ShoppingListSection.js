import { useState } from 'react';
import ShoppingListDrawer from '@/components/shopping/ShoppingListDrawer';
import { useSavedPlanShoppingList } from '@/features/plans/hooks/useSavedPlanShoppingList';

/**
 * ShoppingListSection - triggers drawer with shopping list
 * Uses API via ShoppingListDrawer - server-side data boundary
 */
export default function ShoppingListSection({ recipeIds, servings = 1 }) {
  const [isOpen, setIsOpen] = useState(false);
  const { shoppingList, loading, error, fetchShoppingList } = useSavedPlanShoppingList({ recipeIds, servings });

  const handleOpen = () => {
    if (!shoppingList) {
      fetchShoppingList();
    }
    setIsOpen(true);
  };

  const handleClose = () => setIsOpen(false);

  // The drawer is a sibling of the trigger, not a child: React events bubble
  // through portals, so clicks inside the drawer (close, retry) would
  // otherwise also run handleOpen.
  return (
    <>
      <div
        onClick={handleOpen}
        onTouchStart={() => {}}
        className="px-4 py-3 rounded-lg border-2 border-[#C8D49A] bg-white hover:bg-[#FAFAF5] cursor-pointer transition-colors inline-flex active:scale-95 transition-transform duration-100 touch-manipulation"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛒</span>
          <div className="flex-1">
            <h3 className="font-bold text-[#3A2010]">查看購物清單</h3>
            <p className="text-sm text-[#9B6035]">可按種類或菜式查看</p>
          </div>
          {loading && (
            <span className="text-xs text-[#AA7A50]">載入中...</span>
          )}
        </div>
      </div>

      <ShoppingListDrawer
        isOpen={isOpen}
        onClose={handleClose}
        shoppingList={shoppingList}
        loading={loading}
        error={error}
        onFetch={fetchShoppingList}
      />
    </>
  );
}
