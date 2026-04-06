import { useState } from 'react';
import { aggregateShoppingList } from '@/services/shoppingList';
import { UI } from '@/styles/ui';

/**
 * ShoppingListSection - displays shopping list inline on plan detail page
 * Uses shared service directly - no API roundtrip
 */
export default function ShoppingListSection({ items, recipeIds, servings = 1 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shoppingList, setShoppingList] = useState(null);
  const [error, setError] = useState(null);

  const fetchShoppingList = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use shared service directly - no API roundtrip
      const result = await aggregateShoppingList(recipeIds, [], servings);
      setShoppingList(result);
    } catch (err) {
      setError(err.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (!isOpen && !shoppingList && !loading) {
      fetchShoppingList();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="mt-6">
      {/* CTA Button */}
      <button
        onClick={toggle}
        className={UI.buttonPrimary + " w-full py-3"}
      >
        {isOpen ? '隱藏購物清單' : '查看購物清單'}
      </button>

      {/* Shopping List Content */}
      {isOpen && (
        <div className={UI.card + " p-4 mt-4"}>
          {loading && (
            <p className="text-center py-8 text-[var(--color-text-muted)]">載入中...</p>
          )}
          
          {error && (
            <p className="text-center py-8 text-red-600">{error}</p>
          )}
          
          {!loading && !error && shoppingList && (
            <>
              {/* 有既食材 */}
              {shoppingList.pantry?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">
                    雪櫃已有 ({shoppingList.pantry.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {shoppingList.pantry.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded"
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 需要購買 */}
              {shoppingList.toBuy?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">
                    需要購買 ({shoppingList.toBuy.length})
                  </h4>
                  <div className="space-y-2">
                    {shoppingList.toBuy.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center py-2 border-b border-[#E5DCC8] last:border-0"
                      >
                        <span className="text-[var(--color-text-primary)]">
                          {item.name}
                        </span>
                        <span className="text-sm text-[var(--color-text-muted)]">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Empty state */}
              {(!shoppingList.pantry?.length && !shoppingList.toBuy?.length) && (
                <p className="text-center py-8 text-[var(--color-text-muted)]">
                  沒有食材資料
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
