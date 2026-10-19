import type { RecipeProvenance as Provenance } from '@/features/recipes/mappers/recipeProvenance';

const ALLERGEN_LABELS: Record<string, string> = {
  buckwheat: '蕎麥', crustaceans: '甲殼類', egg: '蛋', fish: '魚', milk: '奶',
  molluscs: '軟體貝類', mollusks: '軟體貝類', peanut: '花生', peanuts: '花生',
  sesame: '芝麻', soy: '黃豆', sulfites: '亞硫酸鹽', tree_nuts: '木本堅果', wheat: '小麥／麩質',
};

export default function RecipeProvenance({ recipe }: { recipe: Partial<Provenance> }) {
  const source = recipe.source_attribution;
  const allergens = [...new Set((recipe.allergens || []).map(value => ALLERGEN_LABELS[value] || value))];
  if (!source && !allergens.length && !recipe.allergen_note) return null;
  return <section className="rounded-2xl p-6 border-2 mb-6" style={{ backgroundColor: '#FEFCF8', borderColor: '#DDD0B0', color: '#5A4030' }}>
    {source && <div>
      <h3 className="text-lg font-bold mb-3">食譜來源</h3>
      <p>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">{source.website || '原食譜'}</a> : source.website}</p>
      {source.author && <p>{source.author}</p>}
      {source.note && <p className="mt-2 text-sm">{source.note}</p>}
    </div>}
    {(allergens.length > 0 || recipe.allergen_note) && <div className={source ? 'mt-4' : ''}>
      <h3 className="text-lg font-bold mb-3">致敏原資訊</h3>
      {allergens.length > 0 && <p>材料涉及：{allergens.join('、')}</p>}
      {recipe.allergen_note && <p className="mt-2 text-sm">{recipe.allergen_note}</p>}
    </div>}
  </section>;
}
