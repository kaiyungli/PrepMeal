import { fetchHomeRecipeCatalog } from '@/lib/recipesServer';
import { selectGuideRecipes, type GuideKind } from './guideRecipes';

export async function getGuideProps(kind: GuideKind) {
  const catalogue = await fetchHomeRecipeCatalog();
  // Throw on an incomplete fetch: ISR keeps the previous valid page rather than
  // publishing an empty recommendation list or stale hard-coded recipe links.
  if (!catalogue) throw new Error('Unable to load the complete public guide catalogue');
  return { props: { recipes: selectGuideRecipes(catalogue, kind) }, revalidate: 300 };
}
