import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';

import { supabase } from '@/lib/supabaseClient';

const colors = {
  background: '#F8F3E8',
  primary: '#9B6035',
  secondary: '#C8D49A',
  accent: '#F0A060',
  text: '#3A2010',
  textLight: '#AA7A50',
  border: '#DDD0B0',
  cardBg: '#FEFCF8',
  tipsBg: '#FFF9E6',
};

export default function RecipeDetail({ recipe, error }) {
  if (error || !recipe) {
    return (
      <div className='min-h-screen bg-[#F8F3E8] py-10 text-center'>
        <p className='text-[#3A2010]'>找不到食譜</p>
      </div>
    );
  }

  const difficultyLabels = { easy: '易', medium: '中', hard: '難' };
  const speedLabels = { quick: '快', normal: '中', slow: '慢' };
  const methodLabels = { stir_fry: '炒', steam: '蒸', boil: '煮', bake: '焗', braised: '炆', grill: '燒' };

  return (
    <>
      <Head>
        <title>{recipe.name} - 今晚食乜</title>
        <meta name="description" content={recipe.description || recipe.name} />
      </Head>
      
      {/* Header */}
      <header className='sticky top-0 bg-[#F8F3E8] border-b border-[#DDD0B0] z-[100] px-5 py-3'>
        <div className='max-w-[1200px] mx-auto flex items-center justify-between'>
          <Link href="/" className='flex items-center gap-2 no-underline text-[#9B6035]'>
            <span className='text-xl'>←</span>
            <span className='text-lg font-bold'>今晚食乜</span>
          </Link>
        </div>
      </header>

      {/* Hero Image */}
      <div className='relative h-[300px] bg-[#C8D49A]'>
        {recipe.image_url ? (
          <Image src={recipe.image_url} alt={recipe.name} fill className='object-cover' priority />
        ) : (
          <div className='h-full flex items-center justify-center text-6xl'>🍳</div>
        )}
        <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />
        <div className='absolute bottom-6 left-5 right-5 text-white'>
          <h1 className='text-3xl font-extrabold mb-2'>{recipe.name}</h1>
          <div className='flex gap-2 flex-wrap'>
            {recipe.difficulty && (
              <span className='bg-[#9B6035] px-3 py-1 rounded-xl text-sm'>
                {difficultyLabels[recipe.difficulty] || recipe.difficulty}
              </span>
            )}
            {recipe.speed && (
              <span className='bg-[#F0A060] px-3 py-1 rounded-xl text-sm'>
                {speedLabels[recipe.speed] || recipe.speed}
              </span>
            )}
            {recipe.method && (
              <span className='bg-[#C8D49A] px-3 py-1 rounded-xl text-sm text-[#3A2010]'>
                {methodLabels[recipe.method] || recipe.method}
              </span>
            )}
            {recipe.calories_per_serving && (
              <span className='bg-white/20 px-3 py-1 rounded-xl text-sm'>
                {recipe.calories_per_serving} 卡
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className='max-w-[1200px] mx-auto p-6 grid grid-cols-12 gap-6'>
        
        {/* Main Content - 8 cols */}
        <div className='col-span-8'>
          
          {/* Description Card */}
          {recipe.description && (
            <div className='bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]'>
              <h3 className='text-base font-bold text-[#3A2010] mb-3'>簡介</h3>
              <p className='text-[#AA7A50] leading-relaxed'>{recipe.description}</p>
            </div>
          )}

          {/* Ingredients Card */}
          <div className='bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]'>
            <h3 className='text-base font-bold text-[#3A2010] mb-4'>🥬 食材</h3>
            {(recipe.ingredients && recipe.ingredients.length > 0) ? (
              <ul className='list-none p-0 m-0'>
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className='flex justify-between py-2.5 border-b border-[#DDD0B0]'>
                    <span className='text-[#3A2010]'>{ing.ingredient_id || ing.ingredient}</span>
                    <span className='text-[#AA7A50]'>{ing.quantity} {ing.unit}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className='text-[#AA7A50]'>暫無食材資料</p>
            )}
          </div>

          {/* Cooking Steps Card */}
          <div className='bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]'>
            <h3 className='text-base font-bold text-[#3A2010] mb-4'>👨‍🍳 烹飪步驟</h3>
            {(recipe.steps && recipe.steps.length > 0) ? (
              <ol className='list-none p-0 m-0'>
                {recipe.steps.map((step, i) => (
                  <li key={i} className='flex gap-4 mb-5 relative'>
                    <div className='w-8 h-8 rounded-full bg-[#9B6035] text-white flex items-center justify-center font-bold flex-shrink-0'>
                      {step.step_no}
                    </div>
                    <div className='flex-1 pt-1'>
                      <p className='text-[#3A2010] leading-relaxed'>{step.text}</p>
                      {step.time_seconds > 0 && (
                        <span className='text-xs text-[#AA7A50] mt-1 block'>
                        ⏱ {Math.floor(step.time_seconds / 60)}分鐘
                      </span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className='text-[#AA7A50]'>暫無步驟資料</p>
            )}
          </div>

          {/* Tips Card */}
          <div className='bg-[#FFF9E6] rounded-xl p-5 border border-[#F0A060]'>
            <h3 className='text-base font-bold text-[#3A2010] mb-3'>💡 小貼士</h3>
            <p className='text-[#AA7A50] leading-relaxed'>
              蕃茄炒蛋關鍵在於控制火候，雞蛋不宜過熟，保持嫩滑口感。蕃茄選擇較熟的會更甜更多汁。
            </p>
          </div>

        </div>

        {/* Sidebar - 4 cols */}
        <div className='col-span-4'>
          
          {/* Action Buttons */}
          <div className='bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]'>
            <button className='w-full py-3.5 bg-[#9B6035] text-white border-none rounded-xl text-base font-semibold cursor-pointer mb-3'>
              + 加入本週餐單
            </button>
            <button className='w-full py-3.5 bg-white text-[#9B6035] border-2 border-[#9B6035] rounded-xl text-base font-semibold cursor-pointer'>
              + 加入購物清單
            </button>
          </div>

          {/* Nutrition Card */}
          <div className='bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]'>
            <h3 className='text-base font-bold text-[#3A2010] mb-4'>📊 營養資料</h3>
            <div className='grid grid-cols-2 gap-3'>
              <div className='text-center p-3 bg-[#F8F3E8] rounded-lg'>
                <div className='text-xl font-bold text-[#9B6035]'>{recipe.calories_per_serving || '-'}</div>
                <div className='text-xs text-[#AA7A50]'>卡路里</div>
              </div>
              <div className='text-center p-3 bg-[#F8F3E8] rounded-lg'>
                <div className='text-xl font-bold text-[#9B6035]'>{recipe.protein_g || '-'}</div>
                <div className='text-xs text-[#AA7A50]'>蛋白質(g)</div>
              </div>
              <div className='text-center p-3 bg-[#F8F3E8] rounded-lg'>
                <div className='text-xl font-bold text-[#9B6035]'>{recipe.carbs_g || '-'}</div>
                <div className='text-xs text-[#AA7A50]'>碳水(g)</div>
              </div>
              <div className='text-center p-3 bg-[#F8F3E8] rounded-lg'>
                <div className='text-xl font-bold text-[#9B6035]'>{recipe.fat_g || '-'}</div>
                <div className='text-xs text-[#AA7A50]'>脂肪(g)</div>
              </div>
            </div>
          </div>

          {/* Related Recipes */}
          <div className='bg-[#FEFCF8] rounded-xl p-5 border border-[#DDD0B0]'>
            <h3 className='text-base font-bold text-[#3A2010] mb-4'>相關食譜</h3>
            <p className='text-[#AA7A50] text-sm'>暫無相關食譜</p>
          </div>

        </div>
      </div>
    </>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const { id } = params;
    if (!supabase) {
      return { props: { recipe: null, error: 'Missing Supabase configuration' } };
    }

    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('id,name,description,image_url,cuisine,dish_type,method,speed,difficulty,calories_per_serving,protein_g,carbs_g,fat_g,slug,is_public,prep_time_minutes,cook_time_minutes')
      .eq('id', id)
      .single();
    
    if (error || !recipe) {
      return { props: { recipe: null, error: 'Not found' } };
    }
    
    const { data: steps } = await supabase
      .from('recipe_steps')
      .select('step_no,text,time_seconds')
      .eq('recipe_id', id)
      .order('step_no');
    
    const { data: ingredients } = await supabase
      .from('recipe_ingredients')
      .select('quantity,unit,ingredient_id')
      .eq('recipe_id', id);
    
    return {
      props: {
        recipe: { ...recipe, steps: steps || [], ingredients: ingredients || [] }
      }
    };
  } catch (e) {
    return { props: { recipe: null, error: e.message } };
  }
}
