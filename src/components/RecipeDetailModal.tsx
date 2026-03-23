import Modal from '@/components/ui/Modal'
import RecipeDetailContent from './RecipeDetailContent'

interface RecipeDetailModalProps {
  isOpen: boolean
  onClose: () => void
  recipe?: any
  loading?: boolean
}

export default function RecipeDetailModal({ isOpen, onClose, recipe, loading }: RecipeDetailModalProps) {
  return (
    <Modal isOpen={isOpen} title="" onClose={onClose} maxWidth="900px">
      {recipe ? (
        <RecipeDetailContent recipe={recipe} isLoading={loading} />
      ) : (
        <div className="flex items-center justify-center py-10">
          <div style={{ color: '#AA7A50' }}>找不到食譜</div>
        </div>
      )}
    </Modal>
  )
}
