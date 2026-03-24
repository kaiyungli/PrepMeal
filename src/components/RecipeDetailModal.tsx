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
  
  // Custom header with close and CTA
  const modalHeader = (
    <div className="flex items-center justify-end w-full">
      <button 
        onClick={handleViewFullRecipe}
        className="text-[#9B6035] hover:text-[#8a5530] font-medium cursor-pointer transition-colors text-sm flex items-center gap-1 bg-transparent border-none"
      >
        完整食譜 ↗
      </button>
    </div>
  )
  
  return (
    <Modal 
      isOpen={isOpen} 
      title="" 
      onClose={onClose} 
      maxWidth="900px"
      header={modalHeader}
    >
      {recipe ? (
        <>
          {/* Recipe Title with Preview Badge */}
          <div className="mb-2">
            <span className="text-xs text-[#AA7A50] bg-[#FFF9E6] px-2 py-0.5 rounded">預覽模式</span>
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
