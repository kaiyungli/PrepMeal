import Modal from '@/components/ui/Modal'
import RecipeDetailContent from './RecipeDetailContent'

interface RecipeDetailModalProps {
  isOpen: boolean
  onClose: () => void
  recipe?: {
    id: number
    name: string
    image_url?: string
    description?: string
    cuisine?: string
    difficulty?: string
    speed?: string
    method?: string
    calories_per_serving?: number
    protein_g?: number
    carbs_g?: number
    fat_g?: number
    ingredients?: Array<{ ingredient_id?: string; ingredient?: string; name?: string; quantity: number; unit: string }>
    steps?: Array<{ step_no: number; text: string; time_seconds?: number }>
  }
  loading?: boolean
}

export default function RecipeDetailModal({ isOpen, onClose, recipe, loading }: RecipeDetailModalProps) {
  return (
    <Modal isOpen={isOpen} title={recipe?.name} onClose={onClose} maxWidth="900px">
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="text-[#AA7A50]">載入中...</div>
        </div>
      ) : recipe ? (
        <RecipeDetailContent recipe={recipe} />
      ) : (
        <div className="flex items-center justify-center py-10">
          <div className="text-[#AA7A50]">找不到食譜</div>
        </div>
      )}
    </Modal>
  )
}
