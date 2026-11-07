import Link from 'next/link';
import type { SamplePlan } from '@/features/guides/samplePlan';

/** Server-rendered example of a generated plan and its merged shopping list. */
export default function HomeSamplePlan({ plan }: { plan?: SamplePlan | null }) {
  if (!plan) return null;
  const dishCount = plan.days.reduce((n, d) => n + d.dishes.length, 0);
  return (
    <section className="max-w-[1100px] mx-auto px-4 py-6" aria-labelledby="home-sample-plan">
      <div className="rounded-2xl border border-[#DDD0B0] bg-white p-6 shadow-sm text-[#5A4030]">
        <h2 id="home-sample-plan" className="text-xl font-bold text-[#3A2010]">一週餐單示範：{plan.servings} 人・{plan.days.length} 晚</h2>
        <p className="mt-2 text-sm">以下係編輯揀選嘅 {dishCount} 道菜，毋須操作即可參考。食譜原配方均為 1 人份，下方清單已按 {plan.servings} 人份合併；白飯另計。</p>
        <div className="mt-5 space-y-6">
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {plan.days.map(d => (
              <li key={d.day} className="rounded-lg bg-[#faf7f0] border border-[#DDD0B0] px-3 py-2 text-sm">
                <span className="font-semibold text-[#9B6035] mr-2">{d.day}</span>
                {d.dishes.map((dish, i) => <span key={dish.slug}>{i > 0 && '＋'}<Link href={`/recipes/${encodeURIComponent(dish.slug)}`} prefetch={false} className="underline">{dish.name}</Link></span>)}
              </li>
            ))}
          </ol>
          <div>
            <p className="font-semibold text-[#3A2010]">合併購物清單・{plan.itemCount} 項</p>
            <p className="mt-2 text-xs text-[#7A5A38]">同一材料按相容單位加總；家中已有嘅調味料可自行剔除。</p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {plan.sections.map(section => <div key={section.key}>
                <h3 className="font-semibold text-[#9B6035]">{section.label}</h3>
                <ul className="mt-1 text-sm">{section.items.map((item, index) => <li key={`${item.name}-${index}`} className="flex justify-between gap-3 border-b border-[#EFE6D2] py-2">
                  <span>{item.name}{item.dishCount > 1 && <span className="block text-xs text-[#7A5A38]">{item.dishCount} 道菜共用</span>}</span>
                  <span className="shrink-0">{item.quantityText}</span>
                </li>)}</ul>
              </div>)}
            </div>
            <p className="mt-4 text-sm"><Link href="/meal-plan-example" className="underline font-medium text-[#9B6035]">睇兩人五晚示例與買餸安排</Link>　或者　<Link href="/generate" className="underline font-medium text-[#9B6035]">生成你自己嘅餐單</Link></p>
          </div>
        </div>
      </div>
    </section>
  );
}
