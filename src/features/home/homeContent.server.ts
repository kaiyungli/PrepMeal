import { loadHeroCandidates } from './homeHero.server';
import { usableHero, HOME_HERO_SERVINGS } from './homeHero';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { supabaseServer } from '@/lib/supabaseServer';
import { loadSamplePlan } from '@/features/guides/samplePlan.server';
import { HOME_EXAMPLES, featuredCandidates, hasUsablePhoto, validHomeExample, type HomeRecipe } from './homeRotation';

const imageChecks = new Map<string, { expires: number; result: Promise<boolean> }>();
export async function publicImageAvailable(url: string): Promise<boolean> {
  if (!hasUsablePhoto(url)) return false;
  const cached = imageChecks.get(url);
  if (cached && cached.expires > Date.now()) return cached.result;
  const result = fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
    .then(response => response.ok && !!response.headers.get('content-type')?.startsWith('image/')).catch(() => false);
  imageChecks.set(url, { expires: Date.now() + 300000, result });
  return result;
}

export async function loadHomeCatalogue(): Promise<HomeRecipe[] | null> {
  if (!supabaseServer) return null;
  const { data, error } = await supabaseServer.from('recipes')
    .select('id,slug,name,image_url,total_time_minutes,difficulty,calories_per_serving,protein_g,base_servings,primary_protein,dish_type,meal_role,method,is_complete_meal,is_public')
    .eq('is_public', true).order('slug').limit(1000);
  return error || !data ? null : data;
}

type Dependencies = {
  catalogue?: typeof loadHomeCatalogue;
  plan?: (days: typeof HOME_EXAMPLES[number]['days'], rows: HomeRecipe[], requireCompleteIngredients: boolean) => ReturnType<typeof loadSamplePlan>;
  image?: typeof publicImageAvailable;
  hero?: typeof loadHeroCandidates;
};

/** Only called by shared ISR regeneration, never by a per-visitor API. */
export async function loadHomeContent(requested: number, dependencies: Dependencies = {}) {
  if (!Number.isInteger(requested) || requested < 0 || requested >= HOME_EXAMPLES.length) throw new Error('Invalid home example');
  const catalogue = await (dependencies.catalogue ?? loadHomeCatalogue)();
  if (!catalogue?.length) throw new Error('Keep the last complete home ISR result: catalogue unavailable');
  const image = dependencies.image ?? publicImageAvailable;
  const planLoader = dependencies.plan ?? loadSamplePlan;
  for (let offset = 0; offset < HOME_EXAMPLES.length; offset++) {
    const index = (requested + offset) % HOME_EXAMPLES.length;
    const example = HOME_EXAMPLES[index];
    if (!validHomeExample(example, catalogue)) continue;
    const rows = catalogue.filter(recipe => example.days.some(day => day.slugs.includes(recipe.slug)));
    if (!(await Promise.all(rows.map(recipe => image(recipe.image_url!)))).every(Boolean)) continue;
    const samplePlan = await planLoader(example.days, rows, true);
    if (!samplePlan || samplePlan.days.length !== 7 || samplePlan.days.some(day => day.dishes.length !== 2) || !samplePlan.sections.length) continue;
    const pool = featuredCandidates(catalogue.filter(recipe => recipe.is_public));
    const healthy = await Promise.all(pool.map(async recipe => await image(recipe.image_url!) ? recipe : null));
    const candidates = healthy.filter((recipe): recipe is NonNullable<typeof recipe> => recipe !== null);
    // The selected, fully validated example also supplies a safe card fallback.
    const fallback = featuredCandidates(rows);
    const featuredRecipes = candidates.length >= 3 ? candidates : featuredCandidates([...candidates, ...fallback]);
    const independentHeroes = await (dependencies.hero ?? loadHeroCandidates)(catalogue, image);
    const fallbackHeroes = samplePlan.days.map(day => ({ ...day.dishes[0], servings: HOME_HERO_SERVINGS })).filter(usableHero);
    const heroCandidates = independentHeroes.length ? independentHeroes : fallbackHeroes;
    const featuredBootstrap = await readFile(path.join(process.cwd(), 'src/features/home/featuredBootstrap.js'), 'utf8');
    return {
      samplePlan, heroCandidates, homeExampleId: example.id,
      requestedExampleId: HOME_EXAMPLES[requested].id, featuredRecipes, featuredBootstrap,
    };
  }
  // ISR retains the existing complete page on error. Do not cache a partial menu.
  throw new Error('Keep the last complete home ISR result: no complete usable example');
}
