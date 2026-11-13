import Head from 'next/head';
import { RecipeStructuredData } from '@/lib/recipeStructuredData.tsx';
import Layout from '@/components/layout/Layout';
import { useEffect } from 'react';
import RecipeDetailContent from '@/components/RecipeDetailContent';
import { loadRecipeDetail } from '@/features/recipes';
import { measurePageLoadMetrics } from '@/utils/perf';
import { DEFAULT_OG_IMAGE } from '@/constants/site';
import { RelatedRecipeLinks } from '@/components/recipes/RecipeLinkSections';

/**
 * Recipe Detail Page - dumb shell only
 * @param {{
 *   recipe?: object | null,
 *   error?: string | null,
 *   related?: import('@/features/recipes/recipeLinks').RelatedRecipes | null
 * }} props
 */
export default function RecipeDetail({ recipe, error, related = null }) {
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

  const recipeUrl = `https://eatwhathk.com/recipes/${encodeURIComponent(safeRecipe.slug || safeRecipe.id)}`;

  return (
    <>
      <Head>
        {/* One string: React renders a <title> with several children as empty. */}
        <title>{`${safeRecipe.name} - 今晚食乜`}</title>
        <meta name="description" content={safeRecipe.description || safeRecipe.name} />
        <link rel="canonical" href={recipeUrl} />
        {/* Share previews (WhatsApp, Facebook): recipe photo, else the site card */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`${safeRecipe.name} - 今晚食乜`} />
        <meta property="og:description" content={safeRecipe.description || safeRecipe.name} />
        <meta property="og:url" content={recipeUrl} />
        <meta property="og:image" content={safeRecipe.image_url || DEFAULT_OG_IMAGE} />
        <meta name="twitter:title" content={`${safeRecipe.name} - 今晚食乜`} />
        <meta name="twitter:image" content={safeRecipe.image_url || DEFAULT_OG_IMAGE} />
      </Head>
      <RecipeStructuredData recipe={safeRecipe} />
      
      {/* Shared site header/footer: navigation and policy links on every recipe page */}
      <Layout>
        <div className="min-h-screen bg-[#F8F3E8]">
          <div className="max-w-[800px] mx-auto py-6 px-4">
            {/* Standalone page: full recipe in server HTML, hero is the LCP image */}
            <RecipeDetailContent recipe={safeRecipe} showAds deferHeavySections={false} heroPriority />
            <RelatedRecipeLinks related={related} />
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
  
  const { fetchRecipeLinkCatalog } = await import('@/lib/recipesServer');
  const { selectRelatedRecipes } = await import('@/features/recipes/recipeLinks');
  const [{ recipe, error }, linkCatalogue] = await Promise.all([
    loadRecipeDetail(params.id),
    fetchRecipeLinkCatalog(),
  ]);

  if (!recipe) {
    return {
      notFound: true,
      revalidate: 300
    };
  }
  
  return {
    props: {
      recipe,
      error: error || null,
      // Links only: a failed catalogue fetch renders the page without them.
      related: linkCatalogue && recipe.slug ? selectRelatedRecipes(recipe, linkCatalogue) : null
    },
    revalidate: 300
  };
}
