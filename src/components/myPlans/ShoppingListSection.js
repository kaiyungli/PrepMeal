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
    <>
      <button
        onClick={handleOpen}
        disabled={loading}
        className="w-full py-3 bg-[#C8D49A] text-[#3A2010] rounded-lg font-medium hover:bg-[#B8C489] transition-colors disabled:opacity-50"
      >
        {loading ? '生成中...' : '生成購物清單'}
      </button>
      
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
    </>
  );
}
