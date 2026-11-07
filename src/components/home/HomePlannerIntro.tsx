import Link from 'next/link';

/** A native GET form hands off to the existing generator, including without JS. */
export default function HomePlannerIntro() {
  return (
    <section className="bg-[#F8F3E8] px-4 pb-8 pt-10 md:pt-16">
      <div className="mx-auto max-w-[1100px] rounded-3xl border border-[#DDD0B0] bg-[#FEFCF8] p-6 md:p-10">
        <p className="mb-3 text-sm font-semibold text-[#9B6035]">今晚食乜 · 一週晚餐規劃</p>
        <h1 className="text-3xl font-bold leading-tight text-[#3A2010] md:text-5xl">一週餐單，<br className="md:hidden" />連買餸清單一齊諗好</h1>
        <p className="mt-4 max-w-2xl text-[#7A5A38]">揀人數同日數，配好晚餐；唔啱口味再換菜，材料按份量合併成一張購物清單。</p>
        <form action="/generate" method="get" className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
          <input type="hidden" name="source" value="home" />
          <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-[#5A4030]">用餐人數
            <select name="servings" defaultValue="2" className="min-h-12 rounded-xl border border-[#DDD0B0] bg-white px-4 text-[#3A2010]">
              {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} 人</option>)}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-[#5A4030]">安排幾日
            <select name="days" defaultValue="7" className="min-h-12 rounded-xl border border-[#DDD0B0] bg-white px-4 text-[#3A2010]">
              {[3, 5, 7].map(n => <option key={n} value={n}>{n} 日</option>)}
            </select>
          </label>
          <button type="submit" className="min-h-12 rounded-xl bg-[#9B6035] px-8 font-semibold text-white hover:bg-[#7A4828]">生成餐單</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#9B6035]">
          <Link href="/generate" className="underline underline-offset-4">詳細設定與現有草稿</Link>
          <Link href="/recipes" className="font-semibold underline underline-offset-4">搜尋食譜 →</Link>
        </div>
        <p className="mt-4 text-xs text-[#7A5A38]">所有食譜以 1 人份為基準，購物清單按所選人數換算。毋須登入即可生成及查看清單。</p>
      </div>
    </section>
  );
}
