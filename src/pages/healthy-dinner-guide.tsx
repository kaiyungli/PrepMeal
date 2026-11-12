import Link from 'next/link';
import { GuidePage, GuideSection } from '@/components/guides/GuidePage';
import {
  LEAN_MAIN_MAX_KCAL, LEAN_MAIN_MIN_PROTEIN_G, LIGHTER_MEAL_MAX_KCAL,
  type HealthyGuideData, type TopicRecipe,
} from '@/features/guides/topicRecipes';

const DH_PYRAMID_PAGE = 'https://www.change4health.gov.hk/tc/healthy_diet/guidelines/food_pyramid/index.html';
const DH_ADULT_PYRAMID = 'https://www.chp.gov.hk/files/her/exn_nutp_030bp.pdf';

function NutritionList({ recipes }: { recipes: TopicRecipe[] }) {
  if (!recipes.length) return <p>目前未有符合條件嘅食譜，請到<Link href="/recipes" className="underline">食譜列表</Link>揀選。</p>;
  return <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {recipes.map(r => <li key={r.id} className="bg-white rounded-xl border border-[#DDD0B0] p-4">
      <Link className="font-semibold text-[#9B6035] underline break-words" href={`/recipes/${encodeURIComponent(r.slug)}`}>{r.name}</Link>
      <p className="text-sm mt-2">每人份約 {r.calories_per_serving} 千卡{r.protein_g != null ? `、蛋白質 ${r.protein_g} 克` : ''}{r.total_time_minutes ? `；約 ${r.total_time_minutes} 分鐘` : ''}</p>
    </li>)}
  </ul>;
}

export default function HealthyDinnerGuide({ data }: { data: HealthyGuideData }) {
  return <GuidePage updated="2026-11-07" title="健康晚餐點樣配" path="/healthy-dinner-guide"
    description="按衞生署成人健康飲食金字塔，計晚餐蔬菜同肉類份量，再揀站內熱量較低、蛋白質較高嘅家常菜。">
    <GuideSection title="先知每日要食幾多">
      <p>衞生署嘅「18至64歲成人健康飲食金字塔」（2020年修訂）建議成年人每日：</p>
      <ul className="list-disc pl-5 mt-3 space-y-2">
        <li>蔬菜最少3份，1份大約係半碗熟菜；</li>
        <li>水果最少2份；</li>
        <li>穀物3至8碗（1碗約250至300毫升）；</li>
        <li>肉、魚、蛋及代替品5至8兩，1兩大約係一個乒乓球大小嘅肉；</li>
        <li>油、鹽、糖食最少；每日飲6至8杯流質。</li>
      </ul>
      <p className="mt-3">晚餐係一日入面最容易補蔬菜嘅一餐：一碟約一碗份量嘅熟菜，已經係2份。肉類唔使特別多，網站主菜一人份多數用120至160克肉、魚或豆腐（大約3至4兩），配一碗飯同一碟菜就夠。</p>
      <p className="mt-3 text-sm">來源：<a className="underline" href={DH_ADULT_PYRAMID}>衞生署：18-64歲成人健康飲食金字塔（PDF）</a>、<a className="underline" href={DH_PYRAMID_PAGE}>活出健康新方向：香港的健康飲食金字塔</a>。如有特別健康需要，請向醫生或營養師查詢。</p>
    </GuideSection>
    <GuideSection title="一個主菜＋一碟菜＋一碗飯">
      <p>想晚餐均衡又唔使諗太多，最簡單係「一個肉／魚／蛋／豆腐主菜＋一碟蔬菜＋一碗飯」。煮法上，主菜揀蒸、灼、煎或者少油快炒；蔬菜用灼或者蒜蓉炒，最後先落鹽。湯、醬汁同醃料都有鹽份，試味先再加。</p>
      <p className="mt-3">喺<Link className="underline" href="/generate">一週晚餐生成器</Link>揀「一肉一菜」或者「二肉一菜」，系統會自動配主菜同蔬菜，再計好購物清單。</p>
    </GuideSection>
    <GuideSection title="熱量較低、蛋白質較高嘅主菜">
      <p className="mb-4">以下主菜按網站營養估算，每人份 {LEAN_MAIN_MAX_KCAL} 千卡或以下、蛋白質 {LEAN_MAIN_MIN_PROTEIN_G} 克或以上（未計白飯）。數字按材料表估算，唔係化驗結果，品牌同份量都會影響。</p>
      <NutritionList recipes={data.leanMains} />
    </GuideSection>
    <GuideSection title="配一碟蔬菜">
      <p className="mb-4">葉菜灼或者炒十分鐘內完成；瀝乾水先落鑊，就唔使用多油。</p>
      <NutritionList recipes={data.vegSides} />
    </GuideSection>
    <GuideSection title={`一人一碟嘅完整餐（${LIGHTER_MEAL_MAX_KCAL} 千卡或以下）`}>
      <p className="mb-4">飯麵類已包主食，適合一個人食或者唔想煮兩道菜嘅晚上；如果蔬菜唔多，可以另外灼一碟菜。</p>
      <NutritionList recipes={data.lighterMeals} />
    </GuideSection>
    <GuideSection title="放工後實際做法">
      <ul className="list-disc pl-5 space-y-2">
        <li>週末先決定三至五晚嘅菜，一次過買耐放嘅材料，葉菜分兩次買。</li>
        <li>肉類買返嚟分成每次用嘅份量先冷藏，煮前一晚移落雪櫃解凍。</li>
        <li>電飯煲先開，再煮主菜；主菜蒸緊或者炆緊時灼菜。</li>
        <li>唔好為咗減肥完全唔食飯；揀細碗，或者將部分白飯換成粟米、薯仔等。</li>
      </ul>
    </GuideSection>
  </GuidePage>;
}

export async function getStaticProps() {
  const { getHealthyGuideProps } = await import('@/features/guides/topicRecipes.server');
  return getHealthyGuideProps();
}
