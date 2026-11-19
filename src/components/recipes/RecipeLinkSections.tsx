import Link from 'next/link';
import type { ReactNode } from 'react';
import type { RecipeIndexGroup, RecipeLink, RelatedRecipes } from '@/features/recipes/recipeLinks';

const recipeHref = (slug: string) => `/recipes/${encodeURIComponent(slug)}`;

/** Link only supplied public dishes; leave all other prose unchanged. */
export function PairingSuggestion({ text, recipes = [] }: { text: string; recipes?: RecipeLink[] }) {
  const links = recipes.filter(recipe => recipe.name && text.includes(recipe.name));
  if (!links.length) return <>{text}</>;
  const names = [...new Set(links.map(recipe => recipe.name))].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(names.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index!;
    parts.push(text.slice(cursor, index));
    const recipe = links.find(recipe => recipe.name === match[0])!;
    parts.push(<Link key={index} href={recipeHref(recipe.slug)} prefetch={false}
      className="underline underline-offset-2 hover:text-[#9B6035] focus-visible:outline-2 focus-visible:outline-offset-2">{match[0]}</Link>);
    cursor = index + match[0].length;
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}

function LinkList({ recipes }: { recipes: RecipeLink[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {recipes.map(r => (
        <li key={r.slug}>
          <Link href={recipeHref(r.slug)} prefetch={false}
            className="inline-block rounded-full border border-[#DDD0B0] bg-white px-3 py-1 text-sm text-[#9B6035] hover:bg-[#FEFCF8]">
            {r.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Links from a recipe page to dishes that complete the meal and similar dishes. */
export function RelatedRecipeLinks({ related }: { related?: RelatedRecipes | null }) {
  if (!related || (!related.pairWith.length && !related.similar.length)) return null;
  return (
    <section className="mt-8 rounded-2xl border-2 border-[#DDD0B0] bg-[#FEFCF8] p-6 text-[#5A4030]" aria-labelledby="related-recipes">
      <h2 id="related-recipes" className="mb-4 text-lg font-bold text-[#3A2010]">再揀多道菜</h2>
      {related.pairWith.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 font-semibold">可以一齊煮</h3>
          <LinkList recipes={related.pairWith} />
        </div>
      )}
      {related.similar.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">同類食譜</h3>
          <LinkList recipes={related.similar} />
        </div>
      )}
      <p className="mt-4 text-sm">
        想一次過安排幾晚？用<Link href="/generate" className="underline">一週晚餐生成器</Link>配好菜式，再睇合併購物清單。
      </p>
    </section>
  );
}

/** Server-rendered index of every public recipe, grouped by meal role. */
export function RecipeIndex({ groups }: { groups?: RecipeIndexGroup[] | null }) {
  if (!groups || !groups.length) return null;
  const total = groups.reduce((n, g) => n + g.recipes.length, 0);
  return (
    <section className="mt-12 rounded-2xl bg-white p-6 shadow-sm text-[#5A4030]" aria-labelledby="recipe-index">
      <h2 id="recipe-index" className="mb-2 text-xl font-bold text-[#3A2010]">全部食譜目錄</h2>
      <p className="mb-6 text-sm">按菜式類型列出全部 {total} 個食譜，全部以 1 人份計，點入可睇材料、步驟同營養資料。</p>
      {groups.map(g => (
        <div key={g.key} className="mb-6">
          <h3 className="mb-3 font-semibold text-[#3A2010]">{g.title}（{g.recipes.length}）</h3>
          <LinkList recipes={g.recipes} />
        </div>
      ))}
    </section>
  );
}
