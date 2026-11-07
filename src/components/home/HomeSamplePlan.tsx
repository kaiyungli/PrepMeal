import Link from 'next/link';
import type { SamplePlan } from '@/features/guides/samplePlan';

/** Server-rendered example of a generated plan and its merged shopping list. */
export default function HomeSamplePlan({ plan }: { plan?: SamplePlan | null }) {
  if (!plan) return null;
  const shared = plan.sharedItems.slice(0, 6);
  return (
    <section className="max-w-[1100px] mx-auto px-6 md:px-8 lg:px-10 py-10" aria-labelledby="home-sample-plan">
      <div className="rounded-2xl border border-[#DDD0B0] bg-white p-6 shadow-sm text-[#5A4030]">
        <h2 id="home-sample-plan" className="text-xl font-bold text-[#3A2010]">示例：兩人五晚「一肉一菜」</h2>
        <p className="mt-2 text-sm">生成器配好菜式之後，會將十道菜嘅材料按人數加埋，變成一張購物清單。</p>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <ol className="space-y-2">
            {plan.days.map(d => (
              <li key={d.day} className="rounded-lg bg-[#faf7f0] border border-[#DDD0B0] px-3 py-2 text-sm">
                <span className="font-semibold text-[#9B6035] mr-2">{d.day}</span>
                {d.dishes.map((dish, i) => <span key={dish.slug}>{i > 0 && '＋'}<Link href={`/recipes/${encodeURIComponent(dish.slug)}`} prefetch={false} className="underline">{dish.name}</Link></span>)}
              </li>
            ))}
          </ol>
          <div>
            <p className="font-semibold text-[#3A2010]">購物清單共 {plan.itemCount} 項，其中幾樣幾道菜都用到：</p>
            <ul className="mt-2 space-y-1 text-sm">
              {shared.map(i => (
                <li key={i.name + i.quantityText} className="flex justify-between gap-3 border-b border-[#EFE6D2] py-1">
                  <span>{i.name}（{i.dishCount}道菜）</span><span className="whitespace-nowrap">{i.quantityText}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm"><Link href="/meal-plan-example" className="underline font-medium text-[#9B6035]">睇完整示例同購物清單</Link>　或者　<Link href="/generate" className="underline font-medium text-[#9B6035]">生成你自己嘅餐單</Link></p>
          </div>
        </div>
      </div>
    </section>
  );
}
