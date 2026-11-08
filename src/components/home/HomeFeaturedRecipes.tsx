import Image from 'next/image';
import Link from 'next/link';

type FeaturedRecipe = { id: string | number; slug: string; name: string; image_url?: string | null; total_time_minutes?: number | null };

export default function HomeFeaturedRecipes({ recipes }: { recipes: FeaturedRecipe[] }) {
  return (
    <section className="pm-wrap" aria-labelledby="featured-recipes">
      <div className="pm-section-head">
        <div><p className="pm-eyebrow">精選食譜</p><h2 id="featured-recipes">今晚，想食邊道？</h2><p>幾道家常菜，俾你一啲靈感。</p></div>
        <Link href="/recipes" className="pm-text-action">搜尋全部食譜 →</Link>
      </div>
      <div className="pm-recipe-grid">
        {recipes.map(recipe => (
          <Link className="pm-recipe-card" href={`/recipes/${encodeURIComponent(recipe.slug)}`} key={recipe.id} prefetch={false}>
            <div className="pm-recipe-photo">
              {recipe.image_url && <Image src={recipe.image_url} alt={recipe.name} width={600} height={400} sizes="(max-width: 767px) calc(100vw - 42px), (max-width: 1200px) 30vw, 370px" />}
              {typeof recipe.total_time_minutes === 'number' && recipe.total_time_minutes > 0 && <span>{recipe.total_time_minutes} 分鐘</span>}
            </div>
            <h3>{recipe.name}</h3><p>查看食譜 <span className="pm-recipe-arrow" aria-hidden="true">→</span></p>
          </Link>
        ))}
      </div>
    </section>
  );
}
