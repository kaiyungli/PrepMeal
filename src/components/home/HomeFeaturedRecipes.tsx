import Image from 'next/image';
import { useLayoutEffect } from 'react';
import '@/features/home/featuredBootstrap';
import Link from 'next/link';

import type { FeaturedRecipe } from '@/features/home/homeRotation';
import { DIFFICULTY_MAP } from '@/constants/taxonomy';
import { formatCalories, nutritionValue } from '@/lib/utils';

declare global {
  interface Window { __prepmealHomeFeatured?: { mount: (slugs: string[], newDocument: boolean) => string[] } }
}

export default function HomeFeaturedRecipes({ recipes, bootstrap }: { recipes: FeaturedRecipe[]; bootstrap?: string }) {
  const slugs = recipes.map(recipe => recipe.slug);
  const signature = JSON.stringify(slugs);
  useLayoutEffect(() => {
    // Reuse this tab's selection on client navigation; never on focus or timers.
    window.__prepmealHomeFeatured?.mount(JSON.parse(signature), false);
  }, [signature]);
  const safeSignature = signature.replace(/</g, String.raw`\u003c`)
    .replace(/\u2028/g, String.raw`\u2028`).replace(/\u2029/g, String.raw`\u2029`);
  const boot = bootstrap ? `${bootstrap}
;window.__prepmealHomeFeatured.mount(${safeSignature},true);` : null;
  return (
    <section className="pm-wrap" aria-labelledby="featured-recipes">
      <div className="pm-section-head">
        <div><p className="pm-eyebrow">精選食譜</p><h2 id="featured-recipes">今晚，想食邊道？</h2><p>幾道家常菜，俾你一啲靈感。</p></div>
        <Link href="/recipes" className="pm-text-action">搜尋全部食譜 →</Link>
      </div>
      {boot && <script dangerouslySetInnerHTML={{ __html: boot }} />}
      <div className="pm-recipe-grid" id="home-featured-list">
        {recipes.map(recipe => {
          const minutes = nutritionValue(recipe.total_time_minutes);
          const difficulty = recipe.difficulty && Object.hasOwn(DIFFICULTY_MAP, recipe.difficulty) ? DIFFICULTY_MAP[recipe.difficulty] : null;
          const meta = [minutes !== null ? `${minutes} 分鐘` : null, difficulty].filter(Boolean).join(' · ');
          const calories = nutritionValue(recipe.calories_per_serving), protein = nutritionValue(recipe.protein_g);
          const nutrition = [calories !== null ? formatCalories(calories) : null, protein !== null ? `蛋白質 ${protein} g` : null].filter(Boolean).join(' · ');
          return (
            <Link className="pm-recipe-card" href={`/recipes/${encodeURIComponent(recipe.slug)}`} key={recipe.id} prefetch={false}>
              <div className="pm-recipe-photo">
                {recipe.image_url && <Image src={recipe.image_url} alt={recipe.name} width={600} height={400} sizes="(max-width: 767px) calc(100vw - 42px), (max-width: 1200px) 30vw, 370px" />}
              </div>
              <div className="pm-recipe-body">
                <h3>{recipe.name}</h3>
                <div className="pm-recipe-meta">{meta}</div>
                <div className="pm-recipe-nutrition">{nutrition && `每人份估算：${nutrition}`}</div>
                <p className="pm-recipe-cta">查看食譜 <span className="pm-recipe-arrow" aria-hidden="true">→</span></p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
