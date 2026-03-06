import { createClient } from '@supabase/supabase-js'
import Head from 'next/head';
import Image from 'next/image';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function RecipeDetail({ recipe, error }) {
  const colors = {
    background: '#F8F3E8',
    primary: '#9B6035',
    secondary: '#C8D49A',
    accent: '#F0A060',
    text: '#3A2010',
    textLight: '#AA7A50',
  };

  if (error || !recipe) {
    return (
      <>
        <div style={{ minHeight: '100vh', background: colors.background, padding: '40px', textAlign: 'center' }}>
          <p>找不到食譜</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{recipe.name} - 今晚食乜</title>
        <meta name="description" content={recipe.description || recipe.name} />
      </Head>
      <div style={{ minHeight: '100vh', background: colors.background, padding: '20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: colors.text }}>{recipe.name}</h1>
          <p style={{ color: colors.textLight }}>{recipe.description}</p>
          
          <h3 style={{ marginTop: '20px' }}>烹飪步驟</h3>
          {(recipe.steps || []).map((s, i) => (
            <div key={i} style={{ marginBottom: '12px' }}>
              <strong>{s.step_no}.</strong> {s.text}
            </div>
          ))}
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
      .select('id,name,description,image_url,cuisine,dish_type,method,speed,difficulty,calories_per_serving,protein_g,carbs_g,fat_g,slug,is_public')
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
    
    return {
      props: {
        recipe: { ...recipe, steps: steps || [] }
      }
    };
  } catch (e) {
    return { props: { recipe: null, error: e.message } };
  }
}
