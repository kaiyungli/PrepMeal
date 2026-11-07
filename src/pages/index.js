import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import RecipeCard from '@/components/RecipeCard';
import HomePlannerIntro from '@/components/home/HomePlannerIntro';
import HomeSamplePlan from '@/components/home/HomeSamplePlan';
import HomeHowItWorks from '@/components/home/HomeHowItWorks';
import { useNavigationDataReady } from '@/features/performance/useNavigationDataReady';

const GUIDES = [
  ['/30-minute-dinner-recipes', '30 分鐘快手菜', '趕時間，先揀做法同備料都合適嘅晚餐。'],
  ['/hong-kong-market-shopping-guide', '買餸攻略', '按餐單安排採購，留意鮮貨保存同補貨。'],
  ['/ingredient-pairing-guide', '按材料揀晚餐', '由主要材料出發，搵主菜同蔬菜配搭。'],
];

export default function Home({ featuredRecipes = [], samplePlan }) {
  useNavigationDataReady('home', true);
  return (
    <Layout>
      <SEO title="一週餐單與合併購物清單" description="揀人數同3、5或7日餐單，換菜後按份量合併買餸材料。先睇兩人一週晚餐示例，再生成自己的餐單。" canonical="https://eatwhathk.com/" ogType="website" />
      <main className="flex-1 bg-[#F8F3E8]">
        <HomePlannerIntro />
        <HomeSamplePlan plan={samplePlan} />
        <HomeHowItWorks />
        <section className="mx-auto max-w-[1100px] px-4 py-10" aria-labelledby="featured-recipes">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div><h2 id="featured-recipes" className="text-2xl font-bold text-[#3A2010]">精選食譜</h2><p className="mt-2 text-sm text-[#7A5A38]">由家常菜開始，所有食譜均以 1 人份計。</p></div>
            <Link href="/recipes" className="rounded-xl border border-[#9B6035] bg-white px-5 py-3 font-semibold text-[#9B6035] hover:bg-[#FEFCF8]">搜尋全部食譜 →</Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
          </div>
        </section>
        <section className="mx-auto max-w-[1100px] px-4 pb-12" aria-labelledby="home-guides">
          <h2 id="home-guides" className="mb-5 text-2xl font-bold text-[#3A2010]">晚餐同買餸實用指南</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {GUIDES.map(([href, title, description]) => <Link key={href} href={href} className="rounded-2xl border border-[#DDD0B0] bg-white p-6 hover:shadow-md"><h3 className="font-semibold text-[#9B6035]">{title} →</h3><p className="mt-2 text-sm text-[#7A5A38]">{description}</p></Link>)}
          </div>
        </section>
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  const { loadSamplePlan } = await import('@/features/guides/samplePlan.server');
  const { HOME_SAMPLE_PLAN_DAYS } = await import('@/features/guides/samplePlan');
  const { fetchRecipesForServer } = await import('@/lib/recipesServer');
  const [samplePlan, recipes] = await Promise.all([loadSamplePlan(HOME_SAMPLE_PLAN_DAYS), fetchRecipesForServer(6)]);
  // Keep the last complete ISR page if upstream data is unavailable.
  if (!samplePlan) throw new Error('Unable to load the homepage sample meal plan');
  return { props: { samplePlan, featuredRecipes: recipes.filter(r => r.slug) }, revalidate: 300 };
}
