import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ShoppingListDrawer from '@/components/shopping/ShoppingListDrawer';

/**
 * ShoppingListSection - triggers drawer with shopping list
 * Uses API via ShoppingListDrawer - server-side data boundary
 */
export default function ShoppingListSection({ recipeIds, servings = 1 }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shoppingList, setShoppingList] = useState(null);
  const [error, setError] = useState(null);

  const fetchShoppingList = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, recipeIds, servings })
      });
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        // Normalize API response to drawer shape
        const normalizedToBuy = {};
        if (data.toBuy && Array.isArray(data.toBuy)) {
          for (const group of data.toBuy) {
            const catKey = group.category || 'other';
            normalizedToBuy[catKey] = group.items || [];
          }
        }
        
        const normalizedByRecipe = [];
        if (data.summary && data.summary.byRecipe) {
          for (const rb of data.summary.byRecipe) {
            normalizedByRecipe.push({
              recipeName: rb.recipeName || rb.name,
              pantry: rb.pantry || [],
              toBuy: rb.toBuy || []
            });
          }
        }
        
        setShoppingList({
          byCategory: { 
            pantry: data.pantry || {}, 
            toBuy: normalizedToBuy 
          },
          byRecipe: normalizedByRecipe
        });
      }
    } catch (err) {
      setError(err.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    if (!shoppingList) {
      fetchShoppingList();
    }
    setIsOpen(true);
  };
  
  const handleClose = () => setIsOpen(false);

  return (
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
      
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
      
      <ShoppingListDrawer
        isOpen={isOpen}
        onClose={handleClose}
        shoppingList={shoppingList}
        loading={loading}
        onFetch={fetchShoppingList}
      />
    </div>
  );
}
