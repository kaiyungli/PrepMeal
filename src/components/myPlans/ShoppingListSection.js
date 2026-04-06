import { useState } from 'react';
import { UI } from '@/styles/ui';
import ShoppingListDrawer from '@/components/shopping/ShoppingListDrawer';

/**
 * ShoppingListSection - triggers drawer with shopping list
 * 
 * Uses reusable ShoppingListDrawer component
 */
export default function ShoppingListSection({ recipeIds, servings = 1 }) {
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
        body: JSON.stringify({ recipeIds, servings })
      });
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setShoppingList(data);
      }
    } catch (err) {
      setError(err.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* CTA Button */}
      <button
        onClick={handleOpen}
        className={UI.buttonPrimary + " w-full py-3 mt-6"}
      >
        查看購物清單
      </button>

      {/* Reusable Drawer */}
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
