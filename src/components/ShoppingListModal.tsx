'use client';

import { useState, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import type { ShoppingListViewModel, ShoppingListItemViewModel } from '@/features/shopping-list/types';
import { CATEGORY_ICONS, CATEGORY_LABELS, SHOPPING_CATEGORY_ORDER } from '@/features/shopping-list/constants';

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  shoppingListView: ShoppingListViewModel | null;
  loading?: boolean;
  error?: string | null;
  onCopy: () => void;
}

const EMPTY_VIEW: ShoppingListViewModel = {
  pantry: [],
  sections: [],
  byRecipe: [],
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
  const [copied, setCopied] = useState(false);

  const viewModel = useMemo(() => {
    if (!shoppingListView) return EMPTY_VIEW;
    return shoppingListView;
  }, [shoppingListView]);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  // Group sections by category order
  const groupedSections = useMemo(() => {
    return SHOPPING_CATEGORY_ORDER.reduce((acc, cat) => {
      const section = viewModel.sections.find(s => s.categoryKey === cat);
      if (section && section.items.length > 0) {
        acc[cat] = section.items;
      }
      return acc;
    }, {} as Record<string, ShoppingListItemViewModel[]>);
  }, [viewModel.sections]);

  if (!isOpen) return null;

  const isEmpty = viewModel.isEmpty;

  return (
    <Modal isOpen={isOpen} title="🛒 購物清單" onClose={onClose} maxWidth="600px">
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-[#9B6035] text-white rounded-lg text-sm hover:bg-[#7a4a2a] transition"
        >
          {copied ? '✅ 已複製!' : '📋 複製清單'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-[#AA7A50]">正在整理購物清單...</div>
        </div>
      ) : error ? (
        <div className="flex justify-center py-12">
          <div className="text-red-500">❌ {error}</div>
        </div>
      ) : isEmpty ? (
        <div className="flex justify-center py-12">
          <div className="text-[#AA7A50]">暫無食材</div>
        </div>
      ) : (
        <div className="max-h-[75vh] overflow-y-auto space-y-6 px-1">
          {viewModel.pantry.length > 0 && (
            <div>
              <h3 className="font-semibold text-green-600 text-base mb-3 flex items-center gap-2">
                ✅ 已有食材
              </h3>
              <div className="flex flex-wrap gap-2">
                {viewModel.pantry.map((item, i) => (
                  <span key={i} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm border border-green-200">
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {viewModel.summary.toBuyCount > 0 && (
            <div>
              <h3 className="font-semibold text-[#9B6035] text-base mb-4 flex items-center gap-2">
                🛒 需要購買
              </h3>
              
              {Object.keys(groupedSections).length > 0 ? (
                Object.entries(groupedSections).map(([category, items]) => (
                  <div key={category} className="mb-5">
                    <h4 className="font-semibold text-[#7a4a2a] text-sm mb-2 flex items-center gap-2 pb-1 border-b border-[#DDD0B0]">
                      <span className="text-lg">{CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || '📦'}</span>
                      <span>{CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}</span>
                    </h4>
                    
                    <div className="space-y-1.5 mt-2">
                      {items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center py-2 px-3 bg-[#FEFCF8] rounded-lg border border-[#F0E8D8]">
                          <span className="text-[#3A2010] font-medium">{item.name}</span>
                          <span className="text-[#9B6035] font-semibold text-sm whitespace-nowrap">
                            {item.quantityPending ? '（數量待補）' : item.quantityText}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-1">
                  {viewModel.sections.flatMap(s => s.items).map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2 px-3 bg-[#FEFCF8] rounded-lg border border-[#F0E8D8]">
                      <span className="text-[#3A2010] font-medium">{item.name}</span>
                      <span className="text-[#9B6035] font-semibold text-sm">
                        {item.quantityPending ? '（數量待補）' : item.quantityText}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
