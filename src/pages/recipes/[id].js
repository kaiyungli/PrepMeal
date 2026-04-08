import Head from 'next/head';
import Link from 'next/link';
import RecipeDetailContent from '@/components/recipes/RecipeDetailContent';

/**
 * Recipe Detail Page
 * 
 * Reuses the same normalized recipe contract as the modal
 */
export default function RecipeDetail({ recipe, error }) {
  // Guard: show loading if no recipe yet
  if (!recipe && !error) {
    return (
      <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center">
        <p className="text-[#AA7A50]">載入中...</p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-[#F8F3E8] py-10 text-center">
        <p className="text-[#3A2010]">找不到食譜</p>
      </div>
    );
  }

  // Safe recipe with defaults
  const safeRecipe = {
    id: recipe?.id || null,
    name: recipe?.name || '未知食譜',
    image_url: recipe?.image_url || null,
    total_time_minutes: recipe?.total_time_minutes || null,
    calories_per_serving: recipe?.calories_per_serving || null,
    servings: recipe?.servings || null,
    description: recipe?.description || '',
    difficulty: recipe?.difficulty || null,
    speed: recipe?.speed || null,
    method: recipe?.method || null,
    ingredients: Array.isArray(recipe?.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe?.steps) ? recipe.steps : []
  };

  console.log('[page] recipe:', safeRecipe?.name, 'ingredients:', safeRecipe?.ingredients?.length, 'steps:', safeRecipe?.steps?.length);

  return (
    <>
      <Head>
        <title>{safeRecipe.name} - 今晚食乜</title>
        <meta name="description" content={safeRecipe.description || safeRecipe.name} />
      </Head>
      
      {/* Header */}
      <header className="sticky top-0 bg-[#F8F3E8] border-b border-[#DDD0B0] z-[100] px-5 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 no-underline text-[#9B6035]">
            <span className="text-xl">←</span>
            <span className="text-lg font-bold">今晚食乜</span>
          </Link>
        </div>
      </header>

      {/* Page Shell */}
      <div className="min-h-screen bg-[#F8F3E8]">
        <div className="max-w-[800px] mx-auto py-6 px-4">
          <RecipeDetailContent recipe={safeRecipe} />
        </div>
      </div>
    </>
  );
}

// Use same API as modal for consistent contract
export async function getServerSideProps({ params }) {
  const API_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  try {
    const res = await fetch(`${API_URL}/api/recipes/${params.id}`);
    
    if (!res.ok) {
      console.log('[page] API error:', res.status);
      return { props: { error: '找不到食譜' } };
    }
    
    const data = await res.json();
    const recipe = data?.recipe;
    
    if (!recipe) {
      console.log('[page] no recipe in response');
      return { props: { error: '找不到食譜' } };
    }
    
    console.log('[page] API success, recipe:', recipe?.name);
    
    return {
      props: {
        recipe // Already normalized by API
      }
    };
  } catch (err) {
    console.error('[page] catch error:', err.message);
    return {
      props: {
        error: err.message || 'Failed to load recipe'
      }
    };
  }
}
