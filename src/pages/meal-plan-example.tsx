import Link from 'next/link';
import { GuidePage, GuideSection } from '@/components/guides/GuidePage';
import type { SamplePlan } from '@/features/guides/samplePlan';

export default function MealPlanExample({ plan }: { plan: SamplePlan }) {
  return <GuidePage updated="2026-11-07" title="示例：兩人五日晚餐同購物清單" path="/meal-plan-example"
    description="用一週晚餐生成器嘅規則砌好兩人五晚「一肉一菜」，再睇十道菜合併之後要買幾多材料。">
    <GuideSection title="點解要先排好幾晚">
      <p>逐晚諗餸，通常會買多咗或者漏買。先排好幾晚，就可以一次過計晒材料：同一樣材料喺唔同菜式用到，清單會自動加埋，唔使自己逐道菜計數。以下係編輯揀嘅一個例子，兩個人食、五晚、每晚一個主菜加一個蔬菜，白飯另外煮。</p>
    </GuideSection>
    <>
      <GuideSection title={`五晚菜式（${plan.servings}人）`}>
        <ol className="space-y-3">
          {plan.days.map(d => <li key={d.day} className="bg-white rounded-xl border border-[#DDD0B0] p-4">
            <p className="font-semibold text-[#3A2010]">{d.day}</p>
            <p className="mt-1">{d.dishes.map((dish, i) => <span key={dish.slug}>{i > 0 && '＋'}<Link className="text-[#9B6035] underline" href={`/recipes/${encodeURIComponent(dish.slug)}`}>{dish.name}</Link>{dish.total_time_minutes ? `（約${dish.total_time_minutes}分鐘）` : ''}</span>)}</p>
            <p className="mt-2 text-sm">{d.note}</p>
          </li>)}
        </ol>
      </GuideSection>
      <GuideSection title={`合併後嘅購物清單（${plan.itemCount}項）`}>
        <p className="mb-4">以下係網站購物清單按十道菜、每道{plan.servings}人份計出嚟嘅結果，同你喺生成器揀同樣菜式會見到嘅一樣。選配材料、清水同屋企已有嘅調味料可以喺清單入面再剔走。</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plan.sections.map(s => <div key={s.key} className="bg-white rounded-xl border border-[#DDD0B0] p-4">
            <h3 className="font-semibold text-[#3A2010] mb-2">{s.label}</h3>
            <ul className="space-y-1 text-sm">
              {s.items.map(i => <li key={i.name + i.quantityText} className="flex justify-between gap-3">
                <span>{i.name}{i.dishCount > 1 ? <span className="text-[#AA7A50]">（{i.dishCount}道菜）</span> : null}</span>
                <span className="text-[#7A6050] whitespace-nowrap">{i.quantityText}</span>
              </li>)}
            </ul>
          </div>)}
        </div>
      </GuideSection>
      {plan.sharedItems.length > 0 && <GuideSection title="邊啲材料可以一次過買">
        <p>呢五晚有 {plan.sharedItems.length} 樣材料喺兩道或以上菜式用到，例如{plan.sharedItems.slice(0, 4).map(i => `${i.name}（${i.dishCount}道菜，共${i.quantityText}）`).join('、')}。逐道菜睇食譜好難發現，合併清單就一眼睇到總量，買一次就夠。</p>
      </GuideSection>}
    </>
    <GuideSection title="買餸同煮嘅次序">
      <ul className="list-disc pl-5 space-y-2">
        <li>週末買齊乾貨、調味料、豬肉碎同雞；魚柳買急凍，煮前一晚放雪櫃解凍。</li>
        <li>葉菜唔耐放，可以分兩次買：第一次買頭兩三晚嘅菜，第三晚之後再補。</li>
        <li>每晚先開電飯煲，再煮主菜；蒸或者炆緊主菜時炒蔬菜。</li>
      </ul>
      <p className="mt-3">想睇更多採購安排，可以參考<Link className="underline" href="/hong-kong-market-shopping-guide">買餸攻略</Link>同<Link className="underline" href="/7-day-dinner-plan">一週晚餐示例</Link>。</p>
    </GuideSection>
    <GuideSection title="砌你自己嘅版本">
      <p>喺<Link className="underline" href="/generate">一週晚餐生成器</Link>揀3、5或7日、用餐人數同「一肉一菜」，系統會配好菜式；唔啱口味可以鎖定想保留嘅菜，再逐道替換。毋須登入就可以睇購物清單，登入後可以保存餐單同勾選已買材料。</p>
    </GuideSection>
  </GuidePage>;
}

export async function getStaticProps() {
  const { loadSamplePlan } = await import('@/features/guides/samplePlan.server');
  // Same rule as the other guides: throw so ISR keeps the previous valid page
  // instead of publishing an example with missing dishes.
  const plan = await loadSamplePlan();
  if (!plan) throw new Error('Unable to load the sample meal plan');
  return { props: { plan }, revalidate: 3600 };
}
