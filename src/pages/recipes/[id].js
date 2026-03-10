import { createClient } from '@supabase/supabase-js'
import Head from 'next/head'
import Link from 'next/link'
import RecipeDetail from '@/components/RecipeDetail'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function RecipePage({ recipe, error }) {
  if (error || !recipe) {
    return (
      <div className='min-h-screen bg-[#F8F3E8] py-10 text-center'>
        <p className='text-[#3A2010]'>找不到食譜</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{recipe.name} - 今晚食乜</title>
        <meta name="description" content={recipe.description || recipe.name} />
      </Head>
      
      <div className="min-h-screen bg-[#F8F3E8]">
        <header className='sticky top-0 bg-[#F8F3E8] border-b border-[#DDD0B0] z-[100] px-5 py-3'>
          <div className='max-w-[1200px] mx-auto flex items-center justify-between'>
            <Link href="/recipes" className="flex items-center gap-2 no-underline text-[#9B6035]">
              ← 返回食譜
            </Link>
          </div>
        </header>

        <main className='max-w-[900px] mx-auto p-6'>
          <RecipeDetail recipe={recipe} />
        </main>
      </div>
    </>
  )
}

export async function getServerSideProps({ params }) {
  try {
    const { id } = params
    
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error || !recipe) {
      return { props: { recipe: null, error: 'Not found' } }
    }

    const { data: steps } = await supabase
      .from('recipe_steps')
      .select('step_no,text,time_seconds')
      .eq('recipe_id', id)
      .order('step_no')
    
    const { data: recipeIngredients } = await supabase
      .from('recipe_ingredients')
      .select('quantity,unit,ingredients(id,name)')
      .eq('recipe_id', id)
    
    const ingredients = (recipeIngredients || []).map(ri => ({
      quantity: ri.quantity,
      unit: ri.unit,
      name: ri.ingredients?.name || ''
    }))

    return {
      props: {
        recipe: { ...recipe, steps: steps || [], ingredients }
      }
    }
  } catch (e) {
    return { props: { recipe: null, error: e.message } }
  }
}
