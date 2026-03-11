import Modal from '@/components/ui/Modal'

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

export default function ShoppingListModal({ isOpen, onClose, shoppingList }: ShoppingListModalProps) {
  return (
    <Modal isOpen={isOpen} title="購物清單" onClose={onClose} maxWidth="600px">
      <div className="space-y-2">
        {shoppingList.map((item, i) => (
          <div key={i} className="flex justify-between py-2 border-b border-[#DDD0B0]">
            <span className="text-[#3A2010]">{item.name}</span>
            <span className="text-[#AA7A50]">{item.quantity} {item.unit || ''}</span>
          </div>
        ))}
        {shoppingList.length === 0 && (
          <p className="text-center text-[#AA7A50] py-4">暫無食材</p>
        )}
      </div>
    </Modal>
  )
}
