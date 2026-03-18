import Link from 'next/link';

export default function HomeHero() {
  return (
    <section className="bg-[#F8F3E8] relative overflow-hidden py-12 md:py-16">
      {/* Top-right green circle decoration */}
      <div className="absolute w-80 h-80 rounded-full bg-[#C8D49A] opacity-60 -top-16 -right-16 hidden md:block"></div>
      
      {/* Bottom-left warm yellow circle decoration */}
      <div className="absolute w-48 h-48 rounded-full bg-[#E8C87A] opacity-40 bottom-0 -left-12 hidden md:block"></div>
      
      <div className="relative z-10 mx-auto max-w-[1200px] px-4">
        <div className="grid grid-cols-12 gap-8 items-center">
          {/* Left side - Text */}
          <div className="col-span-12 md:col-span-6 text-center md:text-left">
            <div className="inline-flex items-center rounded-full bg-[#F8F3E8] px-4 py-1.5 text-sm font-semibold text-[#9B6035] mb-4">
              🍜 今晚食乜
            </div>
            <h1 className="text-[2.5rem] font-extrabold tracking-[-0.02em] text-[#3A2010] md:text-[3rem] leading-tight">
              今晚<br/>食咩好？
            </h1>
            <p className="mt-4 text-base text-[#7A5A38]">
              輸入你有嘅食材，我幫你搵啱啱嘅食譜，亦可以直接生成一週餐單。
            </p>
            
            {/* Input + Button Row */}
            <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
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
                className="h-12 rounded-2xl bg-[#9B6035] px-6 text-sm font-bold text-white transition hover:opacity-95 whitespace-nowrap"
              >
                搵食譜
              </button>
            </div>
            
            {/* Secondary CTA */}
            <div className="mt-4 flex flex-col items-center gap-2 md:flex-row">
              <Link
                href="/generate"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#DDD0B0] bg-[#F8F3E8] px-5 text-sm font-semibold text-[#7A5A38] transition hover:bg-[#F4EDDD]"
              >
                生成一週餐單
              </Link>
              <span className="text-xs text-[#AA7A50]">
                或者直接規劃本週晚餐
              </span>
            </div>
          </div>
          
          {/* Right side - Decorative (hidden on mobile) */}
          <div className="col-span-12 md:col-span-6 hidden md:flex justify-end">
            {/* Placeholder for right side decoration or image */}
            <div className="w-64 h-64 rounded-full bg-gradient-to-br from-[#9B6035] to-[#7A5A38] opacity-10"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
