import type { SamplePlanDish } from '@/features/guides/samplePlan';
import { hasUsablePhoto } from './homeRotation';
export const HOME_HERO_SERVINGS = 2;
export type HomeHeroRecipe = SamplePlanDish & { servings: number };
export function usableHero(recipe: HomeHeroRecipe): boolean {
  return !!recipe.slug?.trim() && !/[\s/?#\\<>]/.test(recipe.slug) && !!recipe.name?.trim()
    && hasUsablePhoto(recipe.image_url) && recipe.servings === HOME_HERO_SERVINGS
    && !!recipe.ingredientExcerpt?.length && recipe.ingredientExcerpt.every(item => !!item.name?.trim() && !!item.quantityText?.trim());
}
export function homeSelectionScript(bootstrap: string | undefined, slugs: string[], channel: 'hero' | 'featured') {
  const signature = JSON.stringify(slugs).replace(/</g, String.raw`\u003c`)
    .replace(/\u2028/g, String.raw`\u2028`).replace(/\u2029/g, String.raw`\u2029`);
  return bootstrap ? `${bootstrap}\n;window.__prepmealHomeFeatured.mount(${signature},true,${JSON.stringify(channel)});` : null;
}
