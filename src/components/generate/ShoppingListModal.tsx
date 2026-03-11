import Modal from '@/components/ui/Modal'
import { useState } from 'react'

interface ShoppingListItem {
  name: string
  quantity: number
  category?: string
  unit?: string
}

interface ShoppingListModalProps {
  isOpen: boolean
  onClose: () => void
  shoppingList: ShoppingListItem[]
}

// Category order
const CATEGORY_ORDER = ['肉類', '海鮮', '蛋類', '豆腐', '蔬菜', '雜貨'];

export default function ShoppingListModal({ isOpen, onClose, shoppingList }: ShoppingListModalProps) {
  const [copied, setCopied] = useState(false);

  // Group by category
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = shoppingList.filter(item => item.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, ShoppingListItem[]>);

  // Add any uncategorized items
  const uncategorized = shoppingList.filter(item => !CATEGORY_ORDER.includes(item.category || '雜貨'));
  if (uncategorized.length > 0) {
    grouped['雜貨'] = [...(grouped['雜貨'] || []), ...uncategorized];
  }

  const handleCopy = () => {
    const text = shoppingList
      .map(item => `${item.name} ${item.quantity}${item.unit || ''}`)
      .join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal isOpen={isOpen} title="購物清單" onClose={onClose} maxWidth="600px">
      {/* Copy Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-[#9B6035] text-white rounded-lg text-sm hover:bg-[#7a4a2a] transition"
        >
          {copied ? '✅ 已複製!' : '📋 複製清單'}
        </button>
      </div>

      {/* Grouped List */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h3 className="font-bold text-[#9B6035] text-sm mb-2">{category}</h3>
            <div className="space-y-1">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between py-1.5 px-2 bg-[#F8F3E8] rounded">
                  <span className="text-[#3A2010]">{item.name}</span>
                  <span className="text-[#AA7A50] font-medium">
                    {item.quantity} {item.unit || ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {shoppingList.length === 0 && (
          <p className="text-center text-[#AA7A50] py-4">暫無食材</p>
        )}
      </div>
    </Modal>
  )
}
