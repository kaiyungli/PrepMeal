import { fetchHomeRecipeCatalog } from '@/lib/recipesServer';
import { selectHealthyGuide, selectIngredientGuide } from './topicRecipes';

// Same rule as the other guides: on an incomplete fetch, throw so ISR keeps
// the previous valid page instead of publishing empty recipe lists.
async function catalogue() {
  const rows = await fetchHomeRecipeCatalog();
  if (!rows) throw new Error('Unable to load the complete public guide catalogue');
  return rows as unknown[];
}

export async function getIngredientGuideProps() {
  return { props: { data: selectIngredientGuide(await catalogue()) }, revalidate: 300 };
}

export async function getHealthyGuideProps() {
  return { props: { data: selectHealthyGuide(await catalogue()) }, revalidate: 300 };
}
