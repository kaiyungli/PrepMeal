import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import HomePlannerIntro from '@/components/home/HomePlannerIntro';
import HomeSamplePlan from '@/components/home/HomeSamplePlan';
import HomeHowItWorks from '@/components/home/HomeHowItWorks';
import HomeFeaturedRecipes from '@/components/home/HomeFeaturedRecipes';
import HomeGuides from '@/components/home/HomeGuides';
import styles from '@/components/home/HomePage.module.css';
import { useNavigationDataReady } from '@/features/performance/useNavigationDataReady';

/**
 * @param {{
 *   featuredRecipes?: import('react').ComponentProps<typeof HomeFeaturedRecipes>['recipes'];
 *   samplePlan: import('@/features/guides/samplePlan').SamplePlan;
 * }} props
 */
export default function Home({ featuredRecipes = [], samplePlan }) {
  useNavigationDataReady('home', true);
  return (
    <Layout home className={styles.home}>
      <SEO title="一週餐單與合併購物清單" description="揀人數同3、5或7日餐單，換菜後按份量合併買餸材料。先睇兩人一週晚餐示例，再生成自己的餐單。" canonical="https://eatwhathk.com/" ogType="website" />
      <main className="flex-1">
        <HomePlannerIntro plan={samplePlan} />
        <HomeSamplePlan plan={samplePlan} />
        <HomeHowItWorks />
        <HomeFeaturedRecipes recipes={featuredRecipes} />
        <HomeGuides />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  const { loadSamplePlan } = await import('@/features/guides/samplePlan.server');
  const { HOME_SAMPLE_PLAN_DAYS } = await import('@/features/guides/samplePlan');
  const { fetchRecipesForServer } = await import('@/lib/recipesServer');
  const [samplePlan, recipes] = await Promise.all([loadSamplePlan(HOME_SAMPLE_PLAN_DAYS), fetchRecipesForServer(3)]);
  // Keep the last complete ISR page if upstream data is unavailable.
  if (!samplePlan) throw new Error('Unable to load the homepage sample meal plan');
  return { props: { samplePlan, featuredRecipes: recipes.filter(r => r.slug) }, revalidate: 300 };
}
