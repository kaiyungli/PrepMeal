import Head from 'next/head';
import Link from 'next/link';
import RecipeDetailContent from '@/components/recipes/RecipeDetailContent';
import { fetchRecipeDetail } from '@/lib/fetchRecipeDetail';

/**
 * Recipe Detail Page - dumb shell only
 */
export default function RecipeDetail({ recipe, error }) {
  console.log('[page] props:', { hasRecipe: !!recipe, error });

  // Guard: loading
  if (!recipe && !error) {
    return (
      <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center">
        <p className="text-[#AA7A50]">載入中...</p>
      </div>
    );
  }

  // Guard: error
  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-[#F8F3E8] py-10 text-center">
        <p className="text-[#3A2010]">找不到食譜</p>
      </div>
    );
  }

  // Safe recipe - double defense
  const safeRecipe = {
    ...recipe,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : []
  };

  console.log('[page] render:', safeRecipe.name);

  return (
    <>
      <Head>
        <title>{safeRecipe.name} - 今晚食乜</title>
        <meta name="description" content={safeRecipe.description || safeRecipe.name} />
      </Head>
      
      {/* Page Shell - dumb wrapper */}
      <header className="sticky top-0 bg-[#F8F3E8] border-b border-[#DDD0B0] z-[100] px-5 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 no-underline text-[#9B6035]">
            <span className="text-xl">←</span>
            <span className="text-lg font-bold">今晚食乜</span>
          </Link>
        </div>
      </header>

      <div className="min-h-screen bg-[#F8F3E8]">
        <div className="max-w-[800px] mx-auto py-6 px-4">
          <RecipeDetailContent recipe={safeRecipe} />
        </div>
      </div>
    </>
  );
}

// Use shared loader
export async function getServerSideProps({ params }) {
  console.log('[page] fetching:', params.id);
  
  const { recipe, error } = await fetchRecipeDetail(params.id);
  
  console.log('[page] result:', error ? 'error' : 'success');
  
  return {
    props: {
      recipe: recipe || null,
      error: error || null
    }
  };
}
