import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hivnajhqqvaokthzhugx.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpdm5hamhxcXZhb2t0aHp1Z3giLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3MjQzMDM4OCwiZXhwIjoyMDg4MDA2Mzg4fQ.Y7V8xM0vP0K7r5X2t4dN9qG3jH6vL8cB1pS2wE5rT0'
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
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !recipe) {
      return { props: { recipe: null, error: 'Not found' } };
    }
    
    const { data: steps } = await supabase
      .from('recipe_steps')
      .select('*')
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
