import Modal from '@/components/ui/Modal'
import RecipeDetailContent from './RecipeDetailContent'
import Link from 'next/link'
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
          <RecipeDetailContent recipe={recipe} isLoading={loading} />
          <div className="mt-4 pt-4 border-t border-[#DDD0B0]">
            <button 
              onClick={handleViewFullRecipe}
              className="w-full py-3 bg-[#9B6035] text-white border-none rounded-xl text-base font-semibold cursor-pointer hover:bg-[#8a5530] transition-colors"
            >
              查看完整食譜 →
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-10">
          <div style={{ color: '#AA7A50' }}>找不到食譜</div>
        </div>
      )}
    </Modal>
  )
}
