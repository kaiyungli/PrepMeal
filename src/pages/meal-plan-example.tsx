import Link from 'next/link';
import { GuidePage, GuideSection } from '@/components/guides/GuidePage';
import { SAMPLE_PLAN_DAYS, type SamplePlan } from '@/features/guides/samplePlan';

const STORE_CATEGORIES = new Set(['seasoning', 'pantry']);
type Props = { plan: SamplePlan; firstTrip: SamplePlan; secondTrip: SamplePlan };

function IngredientGroups({ sections }: { sections: SamplePlan['sections'] }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    {sections.map(section => <div key={section.key} className="rounded-xl border border-[#DDD0B0] bg-white p-4">
      <h3 className="mb-3 font-semibold text-[#3A2010]">{section.label}</h3>
      <ul className="space-y-2 text-sm">
        {section.items.map(item => <li key={item.name + item.quantityText} className="flex justify-between gap-4">
          <span>{item.name}{item.dishCount > 1 && <span className="text-[#7A6553]">（{item.dishCount}道菜）</span>}</span>
          <span className="shrink-0 text-[#7A6050]">{item.quantityText}</span>
        </li>)}
      </ul>
    </div>)}
  </div>;
}

const NIGHT_NOTES = [
  '先蒸肉餅，蒸煮期間炒油麥菜。今晚將第二晚的急凍魚柳移到雪櫃保鮮格，放在有蓋容器內解凍；較厚的魚柳可能需要更長時間。',
  '魚柳完全解凍後才按食譜烹調，配西蘭花。今晚將第三晚的豬肉碎從冰格移到雪櫃保鮮格解凍。',
  '用已解凍的豬肉碎煮麻婆豆腐，配小白菜。煮完後檢查蒜頭、食油及調味料，第二次買餸只補不足的部分。',
  '第二次買餸後，先炆咖哩雞，最後炒生菜。雞翼另行分裝；如前一晚醃好，須蓋好並放回雪櫃保鮮格。',
  '按食譜煮雞翼及菠菜。再檢查剩下的材料及包裝期限，決定下一餐用甚麼，毋須為了清空材料而勉強使用。',
];

export default function MealPlanExample({ plan, firstTrip, secondTrip }: Props) {
  const pantry = plan.sections.filter(section => STORE_CATEGORIES.has(section.key));
  return <GuidePage updated="2026-11-14" title="兩人五日晚餐：分兩次買餸，逐晚有安排" path="/meal-plan-example"
    description="第一次準備頭三晚，第四晚前再補買。從清單、分裝到每晚取用，看看一份餐單如何用在日常生活。">
    <aside className="rounded-xl border border-[#DDD0B0] bg-[#F2EBDD] p-5">
      <p className="font-semibold text-[#3A2010]">兩個人・五晚・每晚一肉一菜</p>
      <p className="mt-2 text-sm">這是一份採購安排示例。兩張清單按本頁菜式及兩人份量分別計算，白飯另計；顯示的是食譜用量，並非超市包裝大小。</p>
      <nav aria-label="採購安排" className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#9B6035]">
        <a className="underline underline-offset-4" href="#first-trip">第一次：頭三晚</a>
        <a className="underline underline-offset-4" href="#second-trip">第二次：後兩晚</a>
        <a className="underline underline-offset-4" href="#nightly-plan">五晚取用次序</a>
      </nav>
    </aside>

    <GuideSection title={`先看五晚吃甚麼（${plan.servings}人份）`}>
      <ol className="divide-y divide-[#E9E0D0] rounded-xl border border-[#DDD0B0] bg-white px-5">
        {plan.days.map(day => <li key={day.day} className="py-4 sm:flex sm:gap-6">
          <span className="shrink-0 text-sm font-semibold text-[#7A6553]">{day.day}</span>
          <p className="mt-1 font-semibold sm:mt-0">{day.dishes.map((dish, i) => <span key={dish.slug}>
            {i > 0 && <span className="px-2 font-normal">＋</span>}
            <Link className="text-[#9B6035] underline underline-offset-4" href={`/recipes/${encodeURIComponent(dish.slug)}`}>{dish.name}</Link>
          </span>)}</p>
        </li>)}
      </ol>
    </GuideSection>

    <section id="first-trip" className="scroll-mt-6 space-y-4">
      <div><p className="text-sm font-semibold text-[#9B6035]">第一次買餸・第一晚之前</p>
        <h2 className="mt-1 text-2xl font-semibold">先買頭三晚，肉碎分兩份</h2></div>
      <p>買肉餅、蒸魚及麻婆豆腐需要的材料，連同油麥菜、西蘭花和小白菜。魚柳選急凍，按以下次序安排解凍；豆腐及蔬菜須留意包裝期限與新鮮程度，不適合存放至第三晚的便留待補買。</p>
      <div data-testid="first-trip"><IngredientGroups sections={firstTrip.sections.filter(section => !STORE_CATEGORIES.has(section.key))} /></div>
      <div className="rounded-xl bg-[#F2EBDD] p-5 text-sm">
        <h3 className="font-semibold text-[#3A2010]">買回來先做這三件事</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>豬肉碎按肉餅及麻婆豆腐的食譜用量分裝，標上菜名與日期。第一晚那份放雪櫃保鮮格，第三晚那份即放冰格。</li>
          <li>急凍魚柳先放冰格，第一晚移到雪櫃保鮮格解凍，與即食食物分開，並放在較低層。</li>
          <li>蔬菜及豆腐按包裝指示存放，易變壞的先用；如狀態不理想，調整菜式或採購時間。</li>
        </ol>
      </div>
      {pantry.length > 0 && <details className="rounded-xl border border-[#DDD0B0] p-4">
        <summary className="cursor-pointer font-semibold">出門前先檢查：全週調味料及家中儲備</summary>
        <p className="my-3 text-sm">以下已合併五晚用量。家中足夠的不用再買，第二張清單亦不會重複列出。</p>
        <div data-testid="weekly-pantry"><IngredientGroups sections={pantry} /></div>
      </details>}
    </section>

    <section id="second-trip" className="scroll-mt-6 space-y-4">
      <div><p className="text-sm font-semibold text-[#9B6035]">第二次買餸・第四晚之前</p>
        <h2 className="mt-1 text-2xl font-semibold">再買雞肉、雞翼及後兩晚的菜</h2></div>
      <p>先看看家中還有甚麼，再按清單補買咖哩雞、雞翼、生菜及菠菜的材料。蒜頭、食油等共用材料已在第一次按全週用量合併，今次只需補不足的部分；清單上的材料如家中已有，亦可扣除仍然可用的存貨。</p>
      <div data-testid="second-trip"><IngredientGroups sections={secondTrip.sections.filter(section => !STORE_CATEGORIES.has(section.key))} /></div>
      <p className="rounded-xl bg-[#F2EBDD] p-5 text-sm">雞肉與雞翼分開包好、標明使用晚次。按包裝指示冷藏；未能及時使用便冷凍，並預留雪櫃解凍時間。葉菜分兩次買，可減少在家存放的時間。</p>
    </section>

    <section id="nightly-plan" className="scroll-mt-6 space-y-4">
      <h2 className="text-2xl font-semibold">買好之後，每晚怎樣接下去？</h2>
      <ol className="space-y-3">{plan.days.map((day, index) => <li key={day.day} className="rounded-xl border border-[#DDD0B0] bg-white p-5">
        <h3 className="font-semibold text-[#9B6035]">{day.day}{index === 2 ? '・煮完再檢查存貨' : index === 3 ? '・第二次補買後' : ''}</h3>
        <p className="mt-2 text-sm">{NIGHT_NOTES[index]}</p>
      </li>)}</ol>
    </section>

    <details className="rounded-xl border border-[#DDD0B0] p-5">
      <summary className="cursor-pointer font-semibold">查看全週合併清單（{plan.itemCount}項）</summary>
      <p className="my-4 text-sm">這是兩次採購合計的食譜用量；選配材料及家中已有的材料可自行略過。</p>
      <IngredientGroups sections={plan.sections} />
    </details>

    <GuideSection title="分裝及解凍，要留意甚麼？">
      <p className="text-sm">易腐壞食物應在購買後兩小時內放入雪櫃。保鮮格維持4°C或以下，冰格為−18°C或以下；生肉、魚及家禽須包好，與熟食分開。解凍請在雪櫃保鮮格進行，不要放在室溫或用熱水解凍。所需時間視份量及厚度而定，本頁的晚次安排不代替包裝上的保存指示。</p>
      <p className="mt-3 text-sm text-[#7A6553]">資料參考：食物安全中心〈<a className="underline" href="https://www.cfs.gov.hk/tc_chi/consumer_zone/safefood_all/five_keys_apply_store.html">貯存食物</a>〉及〈<a className="underline" href="https://www.cfs.gov.hk/tc_chi/consumer_zone/safefood_all/five_keys_defrosting.html">解凍食物</a>〉。</p>
    </GuideSection>
    <GuideSection title="換成你們的晚餐安排">
      <p>到<Link className="text-[#9B6035] underline" href="/generate">一週晚餐生成器</Link>選擇人數、日數及「一肉一菜」，再按口味替換菜式。毋須登入即可查看購物清單，登入後可保存餐單。想調整採購方式，可參考<Link className="underline" href="/hong-kong-market-shopping-guide">買餸攻略</Link>。</p>
    </GuideSection>
  </GuidePage>;
}

export async function getStaticProps() {
  const { loadSamplePlan } = await import('@/features/guides/samplePlan.server');
  const [plan, firstTrip, secondTrip] = await Promise.all([
    loadSamplePlan(SAMPLE_PLAN_DAYS, undefined, true),
    loadSamplePlan(SAMPLE_PLAN_DAYS.slice(0, 3), undefined, true),
    loadSamplePlan(SAMPLE_PLAN_DAYS.slice(3), undefined, true),
  ]);
  // Keep the previous ISR page if any dish or ingredient calculation is missing.
  if (!plan || !firstTrip || !secondTrip) throw new Error('Unable to load the sample meal plan');
  return { props: { plan, firstTrip, secondTrip }, revalidate: 3600 };
}
