import { loadRecipePreviews } from '@/features/guides/samplePlan.server';
import { matchesSlotRole } from '@/lib/slotRoles';
import { featuredCandidates, HOME_ISR_SECONDS, type HomeRecipe } from './homeRotation';
import { HOME_HERO_SERVINGS, usableHero, type HomeHeroRecipe } from './homeHero';

/** Cache independent of the seven daily ISR variants; never called per visitor. */
export function createHeroLoader(previews = loadRecipePreviews) {
  let cached: { key: string; expires: number; value: Promise<HomeHeroRecipe[]> } | undefined;
  return (catalogue: HomeRecipe[], image: (url: string) => Promise<boolean>): Promise<HomeHeroRecipe[]> => {
    const candidates = featuredCandidates(catalogue.filter(recipe => recipe.is_public && recipe.base_servings === 1
      && !recipe.is_complete_meal && matchesSlotRole(recipe, 'protein_main')), 12);
    const key = JSON.stringify(candidates);
    if (cached?.key === key && cached.expires > Date.now()) return cached.value;
    const value = (async () => {
      const healthy = (await Promise.all(candidates.map(async recipe => await image(recipe.image_url!) ? recipe : null)))
        .filter((recipe): recipe is NonNullable<typeof recipe> => recipe !== null);
      if (!healthy.length) return [];
      return (await previews(healthy, HOME_HERO_SERVINGS)).filter(usableHero);
    })().catch(() => []);
    cached = { key, expires: Date.now() + HOME_ISR_SECONDS * 1000, value };
    return value;
  };
}
export const loadHeroCandidates = createHeroLoader();
