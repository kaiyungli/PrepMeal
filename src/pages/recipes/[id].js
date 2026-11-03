import Head from 'next/head';
import { RecipeStructuredData } from '@/lib/recipeStructuredData.tsx';
import Layout from '@/components/layout/Layout';
import { useEffect } from 'react';
import RecipeDetailContent from '@/components/RecipeDetailContent';
import { loadRecipeDetail } from '@/features/recipes';
import { measurePageLoadMetrics } from '@/utils/perf';

/**
 * Recipe Detail Page - dumb shell only
 */
export default function RecipeDetail({ recipe, error }) {
  // Keep hook order stable across loading, error and successful renders.
  // Metrics still start only when there is a recipe to display.
  const hasRecipe = Boolean(recipe && !error);
  useEffect(() => {
    if (!hasRecipe) return;
    return measurePageLoadMetrics();
  }, [hasRecipe]);

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
      <Layout>
        <div className="min-h-screen bg-[#F8F3E8] py-10 text-center">
          <p className="text-[#3A2010]">找不到食譜</p>
        </div>
      </Layout>
    );
  }

  // Safe recipe - double defense
  const safeRecipe = {
    ...recipe,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : []
  };

  return (
    <>
      <Head>
        {/* One string: React renders a <title> with several children as empty. */}
        <title>{`${safeRecipe.name} - 今晚食乜`}</title>
        <meta name="description" content={safeRecipe.description || safeRecipe.name} />
        <link rel="canonical" href={`https://eatwhathk.com/recipes/${encodeURIComponent(safeRecipe.slug || safeRecipe.id)}`} />
      </Head>
      <RecipeStructuredData recipe={safeRecipe} />
      
      {/* Shared site header/footer: navigation and policy links on every recipe page */}
      <Layout>
        <div className="min-h-screen bg-[#F8F3E8]">
          <div className="max-w-[800px] mx-auto py-6 px-4">
            {/* Standalone page: full recipe in server HTML, hero is the LCP image */}
            <RecipeDetailContent recipe={safeRecipe} showAds deferHeavySections={false} heroPriority />
          </div>
        </div>
      </Layout>
    </>
  );
}

// Static generation with ISR (5 min revalidation)
export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking'
  };
}

export async function getStaticProps({ params }) {
  
  const { recipe, error } = await loadRecipeDetail(params.id);
  
  
  if (!recipe) {
    return {
      notFound: true,
      revalidate: 300
    };
  }
  
  return {
    props: {
      recipe,
      error: error || null
    },
    revalidate: 300
  };
}
