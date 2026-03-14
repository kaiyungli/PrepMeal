import Modal from '@/components/ui/Modal'
import { useState } from 'react'

interface ShoppingListItem {
  name: string
  quantity: number
  category?: string
  unit?: string
  inPantry?: boolean
}

interface ShoppingListModalProps {
  isOpen: boolean
  onClose: () => void
  shoppingList: ShoppingListItem[]
}

// Category order
const CATEGORY_ORDER = ['肉類', '海鮮', '蛋類', '豆腐', '蔬菜', '雜貨', '其他'];

export default function ShoppingListModal({ isOpen, onClose, shoppingList }: ShoppingListModalProps) {
  const [copied, setCopied] = useState(false);

  // Separate into pantry vs shopping
  const pantryItems = shoppingList.filter(item => item.inPantry)
  const shopItems = shoppingList.filter(item => !item.inPantry)

  // Debug
  console.log('[MODAL] shopItems:', shopItems.length);
  console.log('[MODAL] categories:', shopItems.map(i => i.category));

  // Group shopping items by category (with fallback for missing categories)
  const groupByCategory = (items: ShoppingListItem[]) => {
    return CATEGORY_ORDER.reduce((acc, cat) => {
      const filtered = items.filter(item => (item.category || '其他') === cat)
      if (filtered.length > 0) acc[cat] = filtered
      return acc
    }, {} as Record<string, ShoppingListItem[]>)
  }

  const shopGrouped = groupByCategory(shopItems)

  const handleCopy = () => {
    // Simple format: just names for pantry, full for shopping
    const pantryText = pantryItems.length > 0 
      ? '已有食材\n' + pantryItems.map(i => i.name).join('\n')
      : ''
    const shopText = shopItems.length > 0
      ? '需要購買\n' + shopItems.map(i => `${i.name} ${i.quantity}${i.unit || ''}`).join('\n')
      : ''
    
    const text = [pantryText, shopText].filter(Boolean).join('\n\n')
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

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

      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {/* 已有食材 - just names */}
        {pantryItems.length > 0 && (
          <div>
            <h3 className="font-bold text-green-600 text-sm mb-2">已有食材</h3>
            <div className="flex flex-wrap gap-2">
              {pantryItems.map((item, i) => (
                <span key={i} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                  {item.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 需要購買 */}
        {shopItems.length > 0 && (
          <div>
            <h3 className="font-bold text-[#9B6035] text-sm mb-2">需要購買</h3>
            {Object.keys(shopGrouped).length > 0 ? (
              Object.entries(shopGrouped).map(([category, items]) => (
                <div key={category} className="mb-3">
                  <h4 className="text-xs text-[#AA7A50] mb-1">{category}</h4>
                  <div className="space-y-1">
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between py-1.5 px-2 bg-[#F8F3E8] rounded">
                        <span className="text-[#3A2010]">{item.name}</span>
                        <span className="text-[#AA7A50] font-medium">
                          {(item as any).source === 'ingredients_list' 
                            ? '（數量待補）' 
                            : `${item.quantity} ${item.unit || ''}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Fallback: flat list if grouping failed
              <div className="space-y-1">
                {shopItems.map((item, i) => (
                  <div key={i} className="flex justify-between py-1.5 px-2 bg-[#F8F3E8] rounded">
                    <span className="text-[#3A2010]">{item.name}</span>
                    <span className="text-[#AA7A50] font-medium">
                      {(item as any).source === 'ingredients_list' 
                        ? '（數量待補）' 
                        : `${item.quantity} ${item.unit || ''}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {shoppingList.length === 0 && (
          <p className="text-center text-[#AA7A50] py-4">暫無食材</p>
        )}
      </div>
    </Modal>
  )
}
