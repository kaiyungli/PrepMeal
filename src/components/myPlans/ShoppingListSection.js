import { useState } from 'react';
import ShoppingListDrawer from '@/components/shopping/ShoppingListDrawer';

/**
 * ShoppingListSection - triggers drawer with shopping list
 * Uses API via ShoppingListDrawer - server-side data boundary
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

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  return (
    <>
      {/* Premium Card-Style CTA */}
      <div className="mb-4">
        <button
          onClick={handleOpen}
          className="w-full flex items-center justify-between rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3 shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
        >
          {/* Left */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#F6F1EB]">
              🛒
            </div>

            <div className="text-left">
              <div className="text-[15px] font-semibold text-[#3D3D3D]">
                查看購物清單
              </div>
              <div className="text-xs text-[#9A9A9A]">
                可按種類或菜式查看
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="text-[#B0B0B0] text-lg">
            →
          </div>
        </button>
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
