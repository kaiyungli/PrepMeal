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
            <h1 className="clamp(4rem, 10vw, 9rem) font-black leading-none tracking-[-0.02em] text-[#3A2010] mb-8">
              今晚食乜
            </h1>
            <p className="mt-2 text-base text-[#7A5A38]">
              輸入你有嘅食材，我幫你搵啱啱嘅食譜，亦可以直接生成一週餐單。
            </p>
            
            {/* CTA Button */}
            <div className="mt-6">
              <Link
                href="/generate"
                className="inline-flex px-12 py-4 rounded-full bg-[#9B6035] text-white font-extrabold text-lg hover:opacity-95 transition-opacity"
              >
                生成食譜
              </Link>
            </div>
          </div>
          
          {/* Right side - HeroCard */}
          <div className="col-span-12 md:col-span-6 hidden md:flex justify-center">
            <div className="w-full max-w-[520px] rounded-2xl border-2 border-[#DDD0B0] bg-white p-6 shadow-[0_20px_60px_rgba(155,96,53,0.14)]">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-bold text-[#C0A080]">本週計劃</span>
                  <div className="text-base font-extrabold text-[#9B6035]">WEEKLY PLAN</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#9B6035] flex items-center justify-center text-xl">
                  🍜
                </div>
              </div>
              
              {/* Left column: 本週餐單 */}
              <div className="space-y-3">
                <div className="text-sm font-bold text-[#3A2010]">📅 本週餐單</div>
                
                {/* 5 items */}
                {['週一 番茄意粉', '週二 咖喱飯', '週三 魚香茄子', '週四 鹽焗雞', '週五 炒米粉'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 py-2 border-b border-[#F0E8D8]">
                    <span className="text-sm text-[#9B6035]">{item.split(' ')[0]}</span>
                    <span className="flex-1 text-sm text-[#3A2010]">{item.split(' ')[1]}</span>
                    <span className="text-xs text-[#AA7A50]">25min</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
