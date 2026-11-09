import RecipeCard from '@/components/RecipeCard';
import Toast from '@/components/ui/Toast';
import { useHomeFeaturedFavorites } from '@/features/home/hooks/useHomeFeaturedFavorites';
import { useLayoutEffect } from 'react';
import '@/features/home/featuredBootstrap';
import Link from 'next/link';

import type { FeaturedRecipe } from '@/features/home/homeRotation';

declare global {
  interface Window { __prepmealHomeFeatured?: { mount: (slugs: string[], newDocument: boolean) => string[] } }
}

export default function HomeFeaturedRecipes({ recipes, bootstrap }: { recipes: FeaturedRecipe[]; bootstrap?: string }) {
  const favorites = useHomeFeaturedFavorites();
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
        <div><p className="pm-eyebrow">精選食譜</p><h2 id="featured-recipes">今晚，想食邊道？</h2><p>幾道家常菜，俾你一啲靈感。營養為每人份估算。</p></div>
        <Link href="/recipes" className="pm-text-action">搜尋全部食譜 →</Link>
      </div>
      {boot && <script dangerouslySetInnerHTML={{ __html: boot }} />}
      <div className="pm-recipe-grid" id="home-featured-list">
        {recipes.map(recipe => (
          <RecipeCard key={recipe.id} recipe={recipe} variant="home-featured"
            isFavorite={favorites.isFavorite?.(recipe.id)} favoriteLoading={favorites.isPending?.(recipe.id)}
            onFavoriteClick={() => favorites.onFavoriteClick(recipe.id)} />
        ))}
      </div>
      <Toast toast={favorites.toast} />
    </section>
  );
}
