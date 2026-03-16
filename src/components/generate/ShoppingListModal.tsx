import Modal from '@/components/ui/Modal'
import { useState } from 'react'
import { CATEGORY_ORDER, CATEGORY_ICONS } from '@/constants/ui'
import { formatUnit } from '@/lib/formatters'

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
  loading?: boolean
}

// Category order
const CATEGORY_ORDER = ['肉類', '海鮮', '蛋', '豆腐', '蔬菜', '調味料', '主食', '其他'];

// Category icons
const CATEGORY_ICONS: Record<string, string> = {
  '肉類': '🥩',
  '海鮮': '🦐',
  '蛋': '🥚',
  '豆腐': '🧈',
  '蔬菜': '🥬',
  '調味料': '🧂',
  '主食': '🍚',
  '其他': '📦'
};

// Map DB categories to display categories
const CATEGORY_MAP: Record<string, string> = {
  'meat_seafood': '肉類',
  'meat': '肉類',
  'seafood': '海鮮',
  'egg': '蛋',
  'eggs': '蛋',
  'tofu': '豆腐',
  'vegetables': '蔬菜',
  'produce': '蔬菜',
  'condiments': '調味料',
  'seasoning': '調味料',
  'staple': '主食',
  'grains': '主食',
  'rice': '主食',
  'noodles': '主食'
};

function getDisplayCategory(cat: string | undefined): string {
  if (!cat) return '其他';
  return CATEGORY_MAP[cat.toLowerCase()] || '其他';
}

// Format unit for display
function formatUnit(unit: string | undefined | null): string {
  if (!unit) return '';
  const u = unit.toLowerCase().trim();
  const unitMap: Record<string, string> = {
    'g': 'g', 'gram': 'g', 'grams': 'g',
    'kg': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
    'ml': 'ml', 'milliliter': 'ml', 'milliliters': 'ml',
    'l': 'l', 'liter': 'l', 'liters': 'l',
    'tbsp': 'tbsp', 'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
    'tsp': 'tsp', 'teaspoon': 'tsp', 'teaspoons': 'tsp',
    'cup': 'cup', 'cups': 'cup',
    'pc': 'pc', 'piece': 'pc', 'pieces': 'pc', '個': 'pc'
  };
  return unitMap[u] || unit;
}

export default function ShoppingListModal({ isOpen, onClose, shoppingList, loading = false }: ShoppingListModalProps) {
  const [copied, setCopied] = useState(false);

  // Separate into pantry vs shopping
  const pantryItems = shoppingList.filter(item => item.inPantry)
  const shopItems = shoppingList.filter(item => !item.inPantry)

  // Group shopping items by category - API already returns Chinese category
  const groupByCategory = (items: ShoppingListItem[]) => {
    return CATEGORY_ORDER.reduce((acc, cat) => {
      const filtered = items.filter(item => item.category === cat)
      if (filtered.length > 0) acc[cat] = filtered
      return acc
    }, {} as Record<string, ShoppingListItem[]>)
  }

  const shopGrouped = groupByCategory(shopItems)

  const handleCopy = () => {
    // Format with category grouping and icons
    const lines: string[] = []
    
    // Add pantry items first
    if (pantryItems.length > 0) {
      lines.push('✅ 已有食材')
      pantryItems.forEach(item => {
        lines.push(`  ${item.name}`)
      })
      lines.push('')
    }
    
    // Add shopping items grouped by category
    if (shopItems.length > 0) {
      lines.push('🛒 需要購買')
      lines.push('')
      
      Object.entries(shopGrouped).forEach(([category, items]) => {
        const icon = CATEGORY_ICONS[category] || '📦'
        lines.push(`${icon} ${category}`)
        items.forEach(item => {
          const qty = item.quantity ? `${item.quantity}` : '（數量待補）'
          const unit = formatUnit(item.unit)
          lines.push(`  ${item.name} ${unit ? qty + ' ' + unit : qty}`)
        })
        lines.push('')
      })
    }
    
    const text = lines.join('\n').trim()
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Modal isOpen={isOpen} title="🛒 購物清單" onClose={onClose} maxWidth="600px">
      {/* Copy Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-[#9B6035] text-white rounded-lg text-sm hover:bg-[#7a4a2a] transition"
        >
          {copied ? '✅ 已複製!' : '📋 複製清單'}
        </button>
      </div>

      {/* Loading or Empty State */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-[#AA7A50]">正在整理購物清單...</div>
        </div>
      ) : shoppingList.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="text-[#AA7A50]">暫無食材</div>
        </div>
      ) : (
        <div className="max-h-[75vh] overflow-y-auto space-y-6 px-1">
          {/* 已有食材 - just names */}
          {pantryItems.length > 0 && (
            <div>
              <h3 className="font-semibold text-green-600 text-base mb-3 flex items-center gap-2">
                ✅ 已有食材
              </h3>
              <div className="flex flex-wrap gap-2">
                {pantryItems.map((item, i) => (
                  <span key={i} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm border border-green-200">
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 需要購買 */}
          {shopItems.length > 0 && (
            <div>
              <h3 className="font-semibold text-[#9B6035] text-base mb-4 flex items-center gap-2">
                🛒 需要購買
              </h3>
              
              {Object.keys(shopGrouped).length > 0 ? (
                Object.entries(shopGrouped).map(([category, items]) => (
                  <div key={category} className="mb-5">
                    {/* Category Header */}
                    <h4 className="font-semibold text-[#7a4a2a] text-sm mb-2 flex items-center gap-2 pb-1 border-b border-[#DDD0B0]">
                      <span className="text-lg">{CATEGORY_ICONS[category] || '📦'}</span>
                      <span>{category}</span>
                    </h4>
                    
                    {/* Items */}
                    <div className="space-y-1.5 mt-2">
                      {items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center py-2 px-3 bg-[#FEFCF8] rounded-lg border border-[#F0E8D8]">
                          <span className="text-[#3A2010] font-medium">{item.name}</span>
                          <span className="text-[#9B6035] font-semibold text-sm whitespace-nowrap">
                            {(item as any).source === 'ingredients_list' 
                              ? '（數量待補）' 
                              : `${item.quantity} ${formatUnit(item.unit)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                /* Fallback: flat list */
                <div className="space-y-1">
                  {shopItems.map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2 px-3 bg-[#FEFCF8] rounded-lg border border-[#F0E8D8]">
                      <span className="text-[#3A2010] font-medium">{item.name}</span>
                      <span className="text-[#9B6035] font-semibold text-sm">
                        {(item as any).source === 'ingredients_list' 
                          ? '（數量待補）' 
                          : `${item.quantity} ${formatUnit(item.unit)}`}
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
  )
}
