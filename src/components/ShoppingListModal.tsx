'use client';

import { useMemo } from 'react';
import type { ShoppingListViewModel } from '@/features/shopping-list/types';

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  shoppingListView: ShoppingListViewModel | null;
  loading?: boolean;
  error?: string | null;
  onCopy: () => void;
}

// Safe empty view model
const EMPTY_VIEW: ShoppingListViewModel = {
  pantry: [],
  sections: [],
  summary: { pantryCount: 0, toBuyCount: 0, sectionCount: 0 },
  isEmpty: true,
};

export default function ShoppingListModal({
  isOpen,
  onClose,
  shoppingListView,
  loading = false,
  error = null,
  onCopy,
}: ShoppingListModalProps) {
  // Use safe fallback during SSR
  const viewModel = useMemo(() => {
    if (!shoppingListView) return EMPTY_VIEW;
    return shoppingListView;
  }, [shoppingListView]);

  if (!isOpen) return null;

  const isEmpty = viewModel.isEmpty;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h2 className="text-xl font-bold text-stone-800">🛒 購物清單</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-2xl">×</button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading && <div className="text-center py-8 text-stone-500">載入中...</div>}
          {error && <div className="text-center py-8 text-red-500">❌ {error}</div>}
          {!loading && !error && isEmpty && <div className="text-center py-8 text-stone-500">暫無食材</div>}
          {!loading && !error && !isEmpty && (
            <>
              <div className="mb-4 p-3 bg-stone-50 rounded-lg">
                <div className="text-sm text-stone-600">共 {viewModel.summary.toBuyCount} 項食材（{viewModel.summary.sectionCount} 類）</div>
              </div>

              {viewModel.pantry.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-stone-700 mb-2">🗄️ 庫存</h3>
                  <ul className="space-y-1">
                    {viewModel.pantry.map((item, idx) => (
                      <li key={idx} className="text-sm text-stone-600">{item.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {viewModel.sections.map((section) => (
                <div key={section.categoryKey} className="mb-4">
                  <h3 className="font-semibold text-stone-700 mb-2">{section.categoryIcon} {section.categoryLabel}</h3>
                  <ul className="space-y-1">
                    {section.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between text-sm text-stone-600">
                        <span>{item.name}</span>
                        <span className={item.quantityPending ? 'text-orange-500' : 'text-stone-400'}>{item.quantityText}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-stone-200">
          <button onClick={onCopy} className="flex-1 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700">複製清單</button>
          <button onClick={onClose} className="flex-1 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200">關閉</button>
        </div>
      </div>
    </div>
  );
}
