import { createClient } from '@supabase/supabase-js'
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

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
      <div style={{ minHeight: '100vh', background: '#F8F3E8', padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#3A2010' }}>找不到食譜</p>
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
      <header style={{ position: 'sticky', top: 0, background: '#F8F3E8', borderBottom: `1px solid ${'#DDD0B0'}`, zIndex: 100, padding: '12px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#9B6035' }}>
            <span style={{ fontSize: '20px' }}>←</span>
            <span style={{ fontSize: '18px', fontWeight: '700' }}>今晚食乜</span>
          </Link>
        </div>
      </header>

      {/* Hero Image */}
      <div style={{ position: 'relative', height: '300px', background: colors.secondary }}>
        {recipe.image_url ? (
          <Image src={recipe.image_url} alt={recipe.name} fill style={{ objectFit: 'cover' }} priority />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px' }}>🍳</div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />
        <div style={{ position: 'absolute', bottom: '24px', left: '20px', right: '20px', color: 'white' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>{recipe.name}</h1>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {recipe.difficulty && (
              <span style={{ background: '#9B6035', padding: '4px 12px', borderRadius: '16px', fontSize: '14px' }}>
                {difficultyLabels[recipe.difficulty] || recipe.difficulty}
              </span>
            )}
            {recipe.speed && (
              <span style={{ background: '#F0A060', padding: '4px 12px', borderRadius: '16px', fontSize: '14px' }}>
                {speedLabels[recipe.speed] || recipe.speed}
              </span>
            )}
            {recipe.method && (
              <span style={{ background: colors.secondary, padding: '4px 12px', borderRadius: '16px', fontSize: '14px', color: '#3A2010' }}>
                {methodLabels[recipe.method] || recipe.method}
              </span>
            )}
            {recipe.calories_per_serving && (
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '16px', fontSize: '14px' }}>
                {recipe.calories_per_serving} 卡
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
        
        {/* Main Content - 8 cols */}
        <div style={{ gridColumn: 'span 8' }}>
          
          {/* Description Card */}
          {recipe.description && (
            <div style={{ background: '#FEFCF8', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: `1px solid ${'#DDD0B0'}` }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#3A2010', marginBottom: '12px' }}>簡介</h3>
              <p style={{ color: '#AA7A50', lineHeight: '1.6' }}>{recipe.description}</p>
            </div>
          )}

          {/* Ingredients Card */}
          <div style={{ background: '#FEFCF8', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: `1px solid ${'#DDD0B0'}` }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#3A2010', marginBottom: '16px' }}>🥬 食材</h3>
            {(recipe.ingredients && recipe.ingredients.length > 0) ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < recipe.ingredients.length - 1 ? `1px solid ${'#DDD0B0'}` : 'none' }}>
                    <span style={{ color: '#3A2010' }}>{ing.ingredient_id || ing.ingredient}</span>
                    <span style={{ color: '#AA7A50' }}>{ing.quantity} {ing.unit}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#AA7A50' }}>暫無食材資料</p>
            )}
          </div>

          {/* Cooking Steps Card */}
          <div style={{ background: '#FEFCF8', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: `1px solid ${'#DDD0B0'}` }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#3A2010', marginBottom: '16px' }}>👨‍🍳 烹飪步驟</h3>
            {(recipe.steps && recipe.steps.length > 0) ? (
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, counterReset: 'step' }}>
                {recipe.steps.map((step, i) => (
                  <li key={i} style={{ display: 'flex', gap: '16px', marginBottom: '20px', position: 'relative' }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', background: '#9B6035', color: 'white', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 
                    }}>
                      {step.step_no}
                    </div>
                    <div style={{ flex: 1, paddingTop: '4px' }}>
                      <p style={{ color: '#3A2010', lineHeight: '1.5' }}>{step.text}</p>
                      {step.time_seconds > 0 && (
                        <span style={{ fontSize: '12px', color: '#AA7A50', marginTop: '4px', display: 'block' }}>
                        ⏱ {Math.floor(step.time_seconds / 60)}分鐘
                      </span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p style={{ color: '#AA7A50' }}>暫無步驟資料</p>
            )}
          </div>

          {/* Tips Card */}
          <div style={{ background: colors.tipsBg, borderRadius: '16px', padding: '20px', border: `1px solid ${'#F0A060'}` }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#3A2010', marginBottom: '12px' }}>💡 小貼士</h3>
            <p style={{ color: '#AA7A50', lineHeight: '1.6' }}>
              蕃茄炒蛋關鍵在於控制火候，雞蛋不宜過熟，保持嫩滑口感。蕃茄選擇較熟的會更甜更多汁。
            </p>
          </div>

        </div>

        {/* Sidebar - 4 cols */}
        <div style={{ gridColumn: 'span 4' }}>
          
          {/* Action Buttons */}
          <div style={{ background: '#FEFCF8', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: `1px solid ${'#DDD0B0'}` }}>
            <button style={{ 
              width: '100%', padding: '14px', background: '#9B6035', color: 'white', border: 'none', 
              borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginBottom: '12px' 
            }}>
              + 加入本週餐單
            </button>
            <button style={{ 
              width: '100%', padding: '14px', background: 'white', color: '#9B6035', border: `2px solid ${'#9B6035'}`, 
              borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' 
            }}>
              + 加入購物清單
            </button>
          </div>

          {/* Nutrition Card */}
          <div style={{ background: '#FEFCF8', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: `1px solid ${'#DDD0B0'}` }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#3A2010', marginBottom: '16px' }}>📊 營養資料</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: '#F8F3E8', borderRadius: '8px' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#9B6035' }}>{recipe.calories_per_serving || '-'}</div>
                <div style={{ fontSize: '12px', color: '#AA7A50' }}>卡路里</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#F8F3E8', borderRadius: '8px' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#9B6035' }}>{recipe.protein_g || '-'}</div>
                <div style={{ fontSize: '12px', color: '#AA7A50' }}>蛋白質(g)</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#F8F3E8', borderRadius: '8px' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#9B6035' }}>{recipe.carbs_g || '-'}</div>
                <div style={{ fontSize: '12px', color: '#AA7A50' }}>碳水(g)</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#F8F3E8', borderRadius: '8px' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#9B6035' }}>{recipe.fat_g || '-'}</div>
                <div style={{ fontSize: '12px', color: '#AA7A50' }}>脂肪(g)</div>
              </div>
            </div>
          </div>

          {/* Related Recipes */}
          <div style={{ background: '#FEFCF8', borderRadius: '16px', padding: '20px', border: `1px solid ${'#DDD0B0'}` }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#3A2010', marginBottom: '16px' }}>相關食譜</h3>
            <p style={{ color: '#AA7A50', fontSize: '14px' }}>暫無相關食譜</p>
          </div>

        </div>
      </div>
    </>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const { id } = params;
    
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
