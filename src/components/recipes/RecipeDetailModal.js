import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import RecipeDetailContent from './RecipeDetailContent';

/**
 * Helper to send client logs to server
 * Temporary debug for iPad/Vercel debugging
 */
async function logClient(payload) {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // Silently fail
  }
}

/**
 * RecipeDetailModal - popup modal shell for recipe details
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
      
      // Log: fetch start
      await logClient({
        step: 'fetch_start',
        recipeId,
      });
      
      try {
        const res = await fetch(`/api/recipes/${recipeId}`);
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json();
        
        // Log: fetch success
        await logClient({
          step: 'fetch_success',
          recipeId,
          responseKeys: Object.keys(data || {}),
          hasRecipe: !!data?.recipe,
        });
        
        const recipeData = data?.recipe;
        
        if (!recipeData) {
          setError('找不到食譜');
        } else {
          // Log: before render
          await logClient({
            step: 'before_render',
            recipeId,
            hasRecipe: !!recipeData,
            recipeKeys: Object.keys(recipeData || {}),
            stepsType: typeof recipeData?.steps,
            stepsSample: recipeData?.steps?.[0],
            ingredientsSample: recipeData?.ingredients?.[0],
            descriptionType: typeof recipeData?.description,
          });
          
          setRecipe(recipeData);
        }
      } catch (err) {
        // Log: fetch error
        await logClient({
          step: 'fetch_error',
          recipeId,
          message: err?.message,
          stack: err?.stack,
        });
        
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

  if (!mounted) return null;
  
  // Early log: modal mounted, recipeId present
  useEffect(() => {
    if (mounted && recipeId) {
      logClient({ step: 'modal_mounted', recipeId });
    }
  }, [mounted, recipeId]);


  return createPortal(
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal Shell */}
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
            <RecipeDetailContent recipe={recipe} />
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
