import Link from 'next/link';

export default function HomeHero() {
  return (
    <section className="bg-[#F8F3E8] px-4 pt-8 pb-10 md:pt-12 md:pb-14">
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[880px] rounded-[28px] border border-[#E5DCC8] bg-white px-6 py-10 shadow-[0_16px_40px_rgba(155,96,53,0.08)] md:px-10 md:py-14">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center rounded-full bg-[#F8F3E8] px-4 py-1.5 text-sm font-semibold text-[#9B6035]">
              🍜 今晚食乜
            </div>
            <h1 className="text-[2rem] font-extrabold tracking-[-0.02em] text-[#3A2010] md:text-[3rem]">
              今晚食乜？
            </h1>
            <p className="mx-auto mt-4 max-w-[560px] text-sm leading-7 text-[#7A5A38] md:text-base">
              輸入你有嘅食材，我幫你搵啱啱嘅食譜，亦可以直接生成一週餐單。
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-[700px]">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-[#AA7A50]">
                  🔍
                </span>
                <input
                  type="text"
                  readOnly
                  placeholder="例如：蛋、番茄、雞肉..."
                  className="h-12 w-full rounded-2xl border border-[#DDD0B0] bg-white pl-11 pr-4 text-sm font-medium text-[#3A2010] placeholder:text-[#B08A63] focus:outline-none"
                />
              </div>
              <button
                type="button"
                className="h-12 rounded-2xl bg-[#9B6035] px-6 text-sm font-bold text-white transition hover:opacity-95"
              >
                搵食譜
              </button>
            </div>
            <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/generate"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#DDD0B0] bg-[#F8F3E8] px-5 text-sm font-semibold text-[#7A5A38] transition hover:bg-[#F4EDDD]"
              >
                生成一週餐單
              </Link>
              <div className="text-xs text-[#AA7A50] md:text-sm">
                輸入食材找食譜，或者直接規劃本週晚餐
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
