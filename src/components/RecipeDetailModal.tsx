import RecipeDetailContent from './RecipeDetailContent'
import { useRouter } from 'next/router'

interface RecipeDetailModalProps {
  isOpen: boolean
  onClose: () => void
  recipe?: any
  loading?: boolean
  isFavorite?: boolean
  favoriteLoading?: boolean
  onFavoriteClick?: () => void | Promise<void>
}

export default function RecipeDetailModal({ 
  isOpen, 
  onClose, 
  recipe, 
  loading,
  isFavorite = false,
  favoriteLoading,
  onFavoriteClick
}: RecipeDetailModalProps) {
  // Plain fixed div wrapper - isolating Modal crash
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        padding: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflowY: 'auto'
      }}
    >
      <div
        style={{
          background: 'white',
          maxWidth: '900px',
          width: '100%',
          margin: '40px auto',
          padding: '24px',
          borderRadius: '16px'
        }}
      >
        <button onClick={onClose} type="button" style={{ marginBottom: '16px' }}>Close</button>
        <RecipeDetailContent
          recipe={recipe}
          isLoading={loading}
          isFavorite={isFavorite}
          favoriteLoading={favoriteLoading}
          onFavoriteClick={onFavoriteClick}
        />
      </div>
    </div>
  )
}
