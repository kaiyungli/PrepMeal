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
 *   heroCandidates?: import('react').ComponentProps<typeof HomePlannerIntro>['recipes'];
 *   homeExampleId?: string;
 *   requestedExampleId?: string;
 *   featuredBootstrap?: string;
 *   samplePlan: import('@/features/guides/samplePlan').SamplePlan;
 * }} props
 */
export default function Home({ featuredRecipes = [], samplePlan, heroCandidates, homeExampleId, featuredBootstrap }) {
  useNavigationDataReady('home', true);
  return (
    <Layout className={styles.home}>
      <SEO title="一週餐單與合併購物清單" description="揀人數同3、5或7日餐單，換菜後按份量合併買餸材料。先睇兩人一週晚餐示例，再生成自己的餐單。" canonical="https://eatwhathk.com/" ogType="website" />
      <main className="flex-1" data-home-example={homeExampleId}>
        <HomePlannerIntro recipes={heroCandidates} bootstrap={featuredBootstrap} />
        <HomeSamplePlan plan={samplePlan} />
        <HomeHowItWorks />
        <HomeFeaturedRecipes recipes={featuredRecipes} bootstrap={featuredBootstrap} />
        <HomeGuides />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  const { loadHomeContent } = await import('@/features/home/homeContent.server');
  const { homeExampleIndex } = await import('@/features/home/homeCalendar');
  const { HOME_ISR_SECONDS } = await import('@/features/home/homeRotation');
  return { props: await loadHomeContent(homeExampleIndex()), revalidate: HOME_ISR_SECONDS };
}
