import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const CATEGORY_LABELS = {
  meat: '肉類',
  seafood: '海鮮',
  vegetable: '蔬菜',
  fruit: '水果',
  dairy: '乳製品',
  grain: '穀物',
  seasoning: '調味料',
  other: '其他',
  default: '其他'
};

/**
 * ShoppingListDrawer - Reusable drawer/modal for shopping list
 * 
 * Props:
 * - isOpen: boolean - controls visibility
 * - onClose: function - called when drawer should close
 * - shoppingList: object - { pantry: [], toBuy: { category: [] } }
 * - loading: boolean
 * - error: string | null
 * - onFetch: function - called to fetch data when opened
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && !shoppingList && !loading && !error && onFetch) {
      onFetch();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />
      
      {/* Drawer */}
      <div 
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-50 shadow-xl flex flex-col"
        style={{ animation: 'slideIn 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5DCC8]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            購物清單
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F4EDDD] rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="text-center py-8">
              <p className="text-[var(--color-text-muted)]">載入中...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && shoppingList && (
            <>
              {/* 有既食材 (Pantry) */}
              {shoppingList.pantry?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    雪櫃已有 ({shoppingList.pantry.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {shoppingList.pantry.map((item, idx) => (
                      <span 
                        key={idx}
                        className="px-3 py-1.5 bg-green-100 text-green-800 text-sm rounded-full"
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 需要購買 - Grouped by Category */}
              {shoppingList.toBuy && Object.keys(shoppingList.toBuy).length > 0 ? (
                Object.entries(shoppingList.toBuy).map(([category, items]) => (
                  items.length > 0 && (
                    <div key={category} className="mb-6">
                      <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">
                        {CATEGORY_LABELS[category] || CATEGORY_LABELS.default} ({items.length})
                      </h3>
                      <div className="space-y-2">
                        {items.map((item, idx) => (
                          <div 
                            key={idx}
                            className="flex justify-between items-center py-2 px-3 bg-[#F8F3E8] rounded-lg"
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
                  )
                ))
              ) : (
                !shoppingList.pantry?.length && (
                  <p className="text-center py-8 text-[var(--color-text-muted)]">
                    沒有需要購買的食材
                  </p>
                )
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>,
    document.body
  );
}
