import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const DIFFICULTY = { easy: '易', medium: '中', hard: '難' };
const SPEED = { quick: '快', normal: '中', slow: '慢' };
const METHOD = { stir_fry: '炒', steam: '蒸', boil: '煮', bake: '焗', braised: '炆', grill: '燒' };

/**
 * RecipeDetailModal - displays recipe details in a popup modal
 * 
 * Props:
 * - recipeId: string - recipe ID to fetch
 * - onClose: function - called when modal should close
 */
export default function RecipeDetailModal({ recipeId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!recipeId || !mounted) return;
    
    const fetchRecipe = async () => {
      setLoading(true);
      setError(null);
      setRecipe(null);
      
      try {
        const res = await fetch(`/api/recipes/${recipeId}`);
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json();
        
        // API returns: { recipes: [...] } format
        // Also check for direct recipe object
        console.log('[modal] steps sample:', data?.recipe?.steps?.slice(0,2));
        const recipeData = data?.recipe;
        
        if (!recipeData) {
            setError('找不到食譜');
        } else {
            setRecipe(recipeData);
        }
      } catch (err) {
        console.error('[modal] error:', err);
        setError(err.message || '載入失敗');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecipe();
  }, [recipeId, mounted]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Don't render until mounted
  if (!mounted) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-4 md:inset-8 lg:inset-16 bg-white z-50 rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#DDD0B0] bg-[#F8F3E8]">
          <h2 className="text-lg font-bold text-[#9B6035]">食譜詳情</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#E5DCC8] rounded-full text-[#9B6035]"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <p className="text-[#AA7A50]">載入中...</p>
            </div>
          )}
          
          {error && !loading && (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          
          {!loading && !error && recipe && (
            <div className="p-4">
              {recipe?.image_url && (
                <div className="relative w-full h-48 mb-4 rounded-xl overflow-hidden">
                  <img 
                    src={recipe.image_url} 
                    alt={recipe?.name || '食譜'}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <h1 className="text-xl font-bold text-[#3A2010] mb-2">
                {recipe?.name || '未知食譜'}
              </h1>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {recipe?.difficulty && (
                  <span className="px-2 py-1 bg-[#F0E8D8] text-[#AA7A50] text-sm rounded">
                    {DIFFICULTY[recipe.difficulty] || recipe.difficulty}
                  </span>
                )}
                {recipe?.speed && (
                  <span className="px-2 py-1 bg-[#F0E8D8] text-[#AA7A50] text-sm rounded">
                    {SPEED[recipe.speed] || recipe.speed}
                  </span>
                )}
                {recipe?.method && (
                  <span className="px-2 py-1 bg-[#F0E8D8] text-[#AA7A50] text-sm rounded">
                    {METHOD[recipe.method] || recipe.method}
                  </span>
                )}
                {recipe?.total_time_minutes && (
                  <span className="px-2 py-1 bg-[#F0E8D8] text-[#AA7A50] text-sm rounded">
                    {recipe.total_time_minutes}分鐘
                  </span>
                )}
                {recipe?.calories_per_serving && (
                  <span className="px-2 py-1 bg-[#F0E8D8] text-[#AA7A50] text-sm rounded">
                    {recipe.calories_per_serving}卡
                  </span>
                )}
              </div>
              
              {recipe?.description && (
                <p className="text-[#AA7A50] text-sm mb-4">{recipe.description}</p>
              )}
              
              {recipe?.ingredients?.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-[#3A2010] mb-2">食材</h3>
                  <div className="space-y-1">
                    {recipe.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex justify-between py-1 px-2 bg-[#FEFCF8] rounded">
                        <span className="text-[#3A2010]">{ing?.name || '未知'}</span>
                        <span className="text-[#AA7A50] text-sm">
                          {ing?.quantity || ''} {ing?.unit || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {recipe?.steps?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-[#3A2010] mb-2">步驟</h3>
                  <div className="space-y-2">
                    {recipe.steps.map((step, idx) => {
                      const stepText = typeof step === 'string' ? step : String(step || '');
                      return (
                        <div key={idx} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-[#9B6035] text-white rounded-full flex items-center justify-center text-sm">
                            {idx + 1}
                          </span>
                          <p className="text-[#3A2010] text-sm">{stepText}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
