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
  
  // Custom header with preview badge
  const modalHeader = (
    <span className="text-xs text-[#AA7A50] bg-[#FFF9E6] px-2 py-0.5 rounded">預覽模式</span>
  )
  
  // Floating CTA button in footer
  const modalFooter = (
    <button 
      onClick={handleViewFullRecipe}
      className="w-full bg-[#9B6035] hover:bg-[#8a5530] text-white px-4 py-3 rounded-full font-medium cursor-pointer transition-colors shadow-lg flex items-center justify-center gap-2"
      style={{
        boxShadow: '0 4px 20px rgba(155, 96, 53, 0.4)'
      }}
    >
      查看完整食譜
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </button>
  )
  
  return (
    <Modal 
      isOpen={isOpen} 
      title="" 
      onClose={onClose} 
      maxWidth="900px"
      header={modalHeader}
      footer={modalFooter}
    >
      <RecipeDetailContent recipe={recipe} isLoading={loading} />
    </Modal>
  )
}
