import Link from 'next/link';

interface HomeHeroProps {
  onPrimaryAction?: () => void;
}

export default function HomeHero({ onPrimaryAction }: HomeHeroProps) {
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
            <h1 className="clamp(4rem, 10vw, 9rem) font-black leading-none tracking-[-0.02em] text-[#3A2010] mb-8">
              今晚<br/>食乜
            </h1>
            
            {/* CTA Button */}
            <div className="mt-6">
              <button
                onClick={onPrimaryAction}
                className="inline-flex px-12 py-4 rounded-full bg-[#9B6035] text-white font-extrabold text-lg hover:opacity-95 transition-opacity"
              >
                生成食譜
              </button>
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
              
              {/* Two columns: 餐單 + 購物清單 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 左欄：本週餐單 */}
                <div>
                  <div className="text-sm font-bold text-[#3A2010] mb-2">📅 本週餐單</div>
                  <div className="space-y-1">
                    {/* Done items */}
                    <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-[rgba(200,212,154,0.30)] border border-[rgba(155,96,53,0.22)]">
                      <span className="text-xs text-[#9B6035] font-medium">週一</span>
                      <span className="flex-1 text-sm text-[#3A2010]">番茄炒蛋</span>
                      <span className="text-green-600">✓</span>
                    </div>
                    <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-[rgba(200,212,154,0.30)] border border-[rgba(155,96,53,0.22)]">
                      <span className="text-xs text-[#9B6035] font-medium">週二</span>
                      <span className="flex-1 text-sm text-[#3A2010]">咖喱雞</span>
                      <span className="text-green-600">✓</span>
                    </div>
                    {/* Not done items */}
                    <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-[#faf7f0] border border-[#DDD0B0]">
                      <span className="text-xs text-[#9B6035] font-medium">週三</span>
                      <span className="flex-1 text-sm text-[#3A2010]">西蘭花牛肉</span>
                    </div>
                    <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-[#faf7f0] border border-[#DDD0B0]">
                      <span className="text-xs text-[#9B6035] font-medium">週四</span>
                      <span className="flex-1 text-sm text-[#3A2010]">照燒雞扒</span>
                    </div>
                    <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-[#faf7f0] border border-[#DDD0B0]">
                      <span className="text-xs text-[#9B6035] font-medium">週五</span>
                      <span className="flex-1 text-sm text-[#3A2010]">黑椒牛柳</span>
                    </div>
                  </div>
                </div>
                
                {/* 右欄：購物清單 */}
                <div>
                  <div className="text-sm font-bold text-[#3A2010] mb-2">🛒 購物清單</div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between py-1.5 px-2 bg-[#faf7f0] rounded">
                      <span className="text-sm text-[#3A2010]">雞蛋</span>
                      <span className="text-xs text-[#AA7A50]">x6</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 bg-[#faf7f0] rounded">
                      <span className="text-sm text-[#3A2010]">西蘭花</span>
                      <span className="text-xs text-[#AA7A50]">x1</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 bg-[#faf7f0] rounded">
                      <span className="text-sm text-[#3A2010]">牛肉</span>
                      <span className="text-xs text-[#AA7A50]">300g</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 bg-[#faf7f0] rounded">
                      <span className="text-sm text-[#3A2010]">番茄</span>
                      <span className="text-xs text-[#AA7A50]">x4</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
