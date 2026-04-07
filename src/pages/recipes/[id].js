import Head from 'next/head';
import Link from 'next/link';
import RecipeDetailContent from '@/components/recipes/RecipeDetailContent';

const colors = {
  background: '#F8F3E8',
  primary: '#9B6035',
  text: '#3A2010',
  textLight: '#AA7A50',
};

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

      {/* Page Shell - uses shared content component */}
      <div className="min-h-screen bg-[#F8F3E8]">
        <div className="max-w-[800px] mx-auto py-6 px-4">
          <RecipeDetailContent recipe={recipe} />
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const { getRecipeDetail } = await import('@/lib/recipeDetail');
    const { recipe, ingredients, steps } = await getRecipeDetail(params.id);
    
    return {
      props: {
        recipe: {
          ...recipe,
          ingredients: ingredients.map(ing => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit
          })),
          steps: steps.map(s => s.text || String(s))
        }
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
