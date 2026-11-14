import Link from 'next/link';
import { GuidePage, GuideSection } from '@/components/guides/GuidePage';
import type { SamplePlan } from '@/features/guides/samplePlan';

export default function MealPlanExample({ plan }: { plan: SamplePlan }) {
  return <GuidePage updated="2026-11-14" title="示例：兩人五日晚餐同購物清單" path="/meal-plan-example"
    description="用一週晚餐生成器嘅規則砌好兩人五晚「一肉一菜」，再睇十道菜合併之後要買幾多材料。">
    <aside className="rounded-xl border border-[#DDD0B0] bg-[#F2EBDD] px-5 py-4 text-sm leading-6">
      <p className="font-semibold text-[#5A4030]">紀錄版面示範</p>
      <p>以下餐單及材料來自網站計算；煮食時間、實際購買及剩料尚未記錄。這一版用來預覽紀錄的呈現方式。</p>
    </aside>
    <GuideSection title="點解要先排好幾晚">
      <p>逐晚諗餸，通常會買多咗或者漏買。先排好幾晚，就可以一次過計晒材料：同一樣材料喺唔同菜式用到，清單會自動加埋，唔使自己逐道菜計數。以下係編輯揀嘅一個例子，兩個人食、五晚、每晚一個主菜加一個蔬菜，白飯另外煮。</p>
    </GuideSection>
    <>
      <GuideSection title={`五晚菜式（${plan.servings}人）`}>
        <ol className="space-y-3">
          {plan.days.map((d, index) => <li key={d.day} className="overflow-hidden bg-white rounded-xl border border-[#DDD0B0]">
            <div className="p-5">
              <p className="text-sm font-semibold text-[#9B6035]">{d.day}</p>
              <p className="mt-2 font-semibold text-[#3A2010]">{d.dishes.map((dish, i) => <span key={dish.slug}>{i > 0 && <span className="px-2 font-normal text-[#AA7A50]">＋</span>}<Link className="text-[#9B6035] underline underline-offset-4" href={`/recipes/${encodeURIComponent(dish.slug)}`}>{dish.name}</Link></span>)}</p>
              <p className="mt-3 text-sm">{d.note}</p>
              <p className="mt-2 text-xs text-[#7A6553]">食譜參考時間：{d.dishes.map(dish => `${dish.name} ${dish.total_time_minutes ? `約${dish.total_time_minutes}分鐘` : '見食譜'}`).join('；')}。同時煮不代表時間直接相加。</p>
            </div>
            <details open={index === 0} className="border-t border-[#E9E0D0]">
              <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-[#70543D] hover:bg-[#FBF8F2] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#9B6035]">當晚煮食紀錄</summary>
              <div className="bg-[#FBF8F2] px-5 pb-5 pt-2">
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-[#70543D]">實際用時</dt><dd className="mt-1 text-[#8A7765]">待記錄開始及上枱時間</dd></div>
                  <div><dt className="text-[#70543D]">兩人份量</dt><dd className="mt-1 text-[#8A7765]">待記錄是否足夠、有沒有剩餸</dd></div>
                  <div className="sm:col-span-2"><dt className="text-[#70543D]">當晚調整</dt><dd className="mt-1 text-[#8A7765]">待記錄替換材料、先後次序或需要留意的地方</dd></div>
                </dl>
              </div>
            </details>
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
      <GuideSection title="買完餸，再對一對">
        <p className="mb-4">清單計的是食譜用量，買回來可能是一整包或一整棵。記下實際購入量，便知道哪些可留到下一餐。</p>
        <ul className="space-y-3">
          {plan.sharedItems.slice(0, 3).map(item => <li key={item.name} className="rounded-xl border border-[#DDD0B0] bg-white p-5">
            <h3 className="font-semibold text-[#3A2010]">{item.name}<span className="ml-2 text-sm font-normal text-[#7A6553]">共用於{item.dishCount}道菜</span></h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div><dt className="text-[#70543D]">餐單需要</dt><dd className="mt-1 font-semibold">{item.quantityText}</dd></div>
              <div><dt className="text-[#70543D]">實際購入</dt><dd className="mt-1 text-[#8A7765]">待記錄</dd></div>
              <div><dt className="text-[#70543D]">剩餘及安排</dt><dd className="mt-1 text-[#8A7765]">待記錄</dd></div>
            </dl>
          </li>)}
        </ul>
        <p className="mt-3 text-xs text-[#7A6553]">此處先以三樣共用材料展示紀錄方式；未填入實際採購或花費。</p>
      </GuideSection>
    </>
    <GuideSection title="買餸同煮嘅次序">
      <ul className="list-disc pl-5 space-y-2">
        <li>週末買齊乾貨、調味料、豬肉碎同雞；魚柳買急凍，煮前一晚放雪櫃解凍。</li>
        <li>葉菜唔耐放，可以分兩次買：第一次買頭兩三晚嘅菜，第三晚之後再補。</li>
        <li>每晚先開電飯煲，再煮主菜；蒸或者炆緊主菜時炒蔬菜。</li>
      </ul>
      <p className="mt-3">想睇更多採購安排，可以參考<Link className="underline" href="/hong-kong-market-shopping-guide">買餸攻略</Link>同<Link className="underline" href="/7-day-dinner-plan">一週晚餐示例</Link>。</p>
    </GuideSection>
    <GuideSection title="五晚之後，留低啲心得">
      <div className="rounded-xl border border-[#DDD0B0] bg-white p-5 text-sm">
        <dl className="space-y-4">
          <div><dt className="font-semibold text-[#3A2010]">哪些材料最後仍有剩？</dt><dd className="mt-1 text-[#8A7765]">待記錄剩料及下一餐安排。</dd></div>
          <div><dt className="font-semibold text-[#3A2010]">哪一晚最順手，哪一晚要改？</dt><dd className="mt-1 text-[#8A7765]">待記錄實際遇到的方便或困難。</dd></div>
          <div><dt className="font-semibold text-[#3A2010]">下次會怎樣安排？</dt><dd className="mt-1 text-[#8A7765]">待記錄買餸次數、份量或菜式的調整。</dd></div>
        </dl>
      </div>
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
