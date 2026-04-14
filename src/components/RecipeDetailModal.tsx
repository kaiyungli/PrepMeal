interface RecipeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe?: any;
  loading?: boolean;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onFavoriteClick?: () => void | Promise<void>;
}

export default function RecipeDetailModal({
  isOpen,
  onClose,
  recipe,
}: RecipeDetailModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, padding:'20px', display:'flex', justifyContent:'center', alignItems:'flex-start', overflowY:'auto' }}>
      <div style={{ background:'white', margin:'40px auto', padding:'24px', maxWidth:'900px', width:'100%', borderRadius:'16px' }}>
        <button onClick={onClose} type="button" style={{ marginBottom:'16px' }}>Close</button>
        <div>
          <h1>{recipe?.name || 'No name'}</h1>
          <p>ID: {recipe?.id}</p>
        </div>
      </div>
    </div>
  );
}
