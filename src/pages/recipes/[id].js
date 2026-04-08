import Head from 'next/head';
import Link from 'next/link';
import RecipeDetailContent from '@/components/recipes/RecipeDetailContent';

/**
 * Recipe Detail Page
 * 
 * Reuses the same normalized recipe contract as the modal:
 * - Fetch from /api/recipes/[id] (same path as modal)
 * - UI: RecipeDetailContent (shared with modal)
 */
export default function RecipeDetail({ recipe, error }) {
  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-[#F8F3E8] py-10 text-center">
        <p className="text-[#3A2010]">找不到食譜</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{recipe.name} - 今晚食乜</title>
        <meta name="description" content={recipe.description || recipe.name} />
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

      {/* Page Shell - uses shared UI */}
      <div className="min-h-screen bg-[#F8F3E8]">
        <div className="max-w-[800px] mx-auto py-6 px-4">
          <RecipeDetailContent recipe={recipe} />
        </div>
      </div>
    </>
  );
}

// Use same fetch path as modal for consistent contract
export async function getServerSideProps({ params }) {
  const API_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  try {
    // Reuse the same API endpoint as modal
    const res = await fetch(`${API_URL}/api/recipes/${params.id}`);
    
    if (!res.ok) {
      return { props: { error: '找不到食譜' } };
    }
    
    const data = await res.json();
    const recipe = data?.recipe;
    
    if (!recipe) {
      return { props: { error: '找不到食譜' } };
    }
    
    return {
      props: {
        recipe // Already normalized by API
      }
    };
  } catch (err) {
    return {
      props: {
        error: err.message || 'Failed to load recipe'
      }
    };
  }
}
