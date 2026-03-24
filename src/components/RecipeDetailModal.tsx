import Modal from '@/components/ui/Modal'
import RecipeDetailContent from './RecipeDetailContent'
import { useRouter } from 'next/router'

interface RecipeDetailModalProps {
  isOpen: boolean
  onClose: () => void
  recipe?: any
  loading?: boolean
}

export default function RecipeDetailModal({ isOpen, onClose, recipe, loading }: RecipeDetailModalProps) {
  const router = useRouter()
  
  const handleViewFullRecipe = () => {
    if (recipe?.id) {
      router.push(`/recipes/${recipe.id}`)
    }
  }
  
  return (
    <Modal isOpen={isOpen} title="" onClose={onClose} maxWidth="900px">
      {recipe ? (
        <>
          {/* Preview Header with CTA */}
          <div className="mb-4 pb-3 border-b border-[#DDD0B0] flex items-center justify-between">
            <span className="text-sm text-[#AA7A50]">這是食譜預覽</span>
            <button 
              onClick={handleViewFullRecipe}
              className="text-[#9B6035] hover:text-[#8a5530] font-medium cursor-pointer transition-colors text-sm flex items-center gap-1 bg-transparent border-none"
            >
              前往完整食譜頁 →
            </button>
          </div>
          
          <RecipeDetailContent recipe={recipe} isLoading={loading} />
        </>
      ) : (
        <div className="flex items-center justify-center py-10">
          <div style={{ color: '#AA7A50' }}>找不到食譜</div>
        </div>
      )}
    </Modal>
  )
}
