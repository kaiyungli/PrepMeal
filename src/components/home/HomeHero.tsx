import Link from 'next/link';

interface Recipe {
  id: number;
  name: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  [key: string]: any;
}

interface WeeklyPlanItem {
  day: string;
  recipe: Recipe;
  done?: boolean;
}

interface HomeHeroProps {
  onPrimaryAction?: () => void;
  weeklyPlan?: WeeklyPlanItem[];
  onRefreshPlan?: () => void;
}

const DAYS = ['週一', '週二', '週三', '週四', '週五'];

export default function HomeHero({ onPrimaryAction, weeklyPlan = [], onRefreshPlan }: HomeHeroProps) {
  return (
    <section className="bg-[#F8F3E8] relative overflow-hidden py-12 md:py-16">
      {/* Top-right green circle decoration - LARGER */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-[#C8D49A] opacity-40 -top-32 -right-32 hidden md:block"></div>
      
      {/* Bottom-left warm yellow circle decoration - LARGER */}
      <div className="absolute w-[250px] h-[250px] rounded-full bg-[#E8C87A] opacity-30 -bottom-20 -left-20 hidden md:block"></div>
      
      <div className="relative z-10 mx-auto max-w-[1200px] px-4">
        <div className="grid grid-cols-12 gap-6 items-center">
          {/* Left side - Text - WIDER (col-span-7) */}
          <div className="col-span-12 md:col-span-7 text-center md:text-left">
            <h1 className="text-7xl md:text-[8rem] font-black leading-[0.9] tracking-[-0.03em] text-[#3A2010]">
              今晚<br/>食乜
            </h1>
            
            {/* CTA Button - LARGER */}
            <div className="mt-8">
              <button
                onClick={onPrimaryAction}
                className="px-12 py-5 rounded-full bg-[#9B6035] text-white font-bold text-lg shadow-md hover:opacity-95 transition-opacity"
              >
                生成食譜
              </button>
            </div>
          </div>
          
          {/* Right side - HeroCard - ENHANCED */}
          <div className="col-span-12 md:col-span-5 hidden md:flex justify-center">
            <div className="w-full max-w-[480px] rounded-2xl border border-[#DDD0B0] bg-white p-6 shadow-[0_30px_80px_rgba(155,96,53,0.18)] scale-[1.05]">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-bold text-[#C0A080]">本週計劃</span>
                  <div className="text-base font-extrabold text-[#9B6035]">WEEKLY PLAN</div>
                </div>
                <div className="flex items-center gap-2">
                  {onRefreshPlan && (
                    <button 
                      onClick={onRefreshPlan}
                      className="w-10 h-10 rounded-xl bg-[#F8F3E8] flex items-center justify-center text-lg hover:bg-[#F4EDDD] transition-colors"
                      title="重新生成餐單"
                    >
                      🔄
                    </button>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-[#9B6035] flex items-center justify-center text-xl">
                    🍜
                  </div>
                </div>
              </div>
              
              {/* Two columns: 餐單 + 購物清單 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 左欄：本週餐單 */}
                <div>
                  <div className="text-sm font-bold text-[#3A2010] mb-2">📅 本週餐單</div>
                  <div className="space-y-1">
                    {weeklyPlan.length > 0 ? (
                      weeklyPlan.map((item, index) => (
                        <div 
                          key={item.day} 
                          className={`flex items-center gap-2 py-1.5 px-2 rounded ${
                            item.done 
                              ? 'bg-[rgba(200,212,154,0.30)] border border-[rgba(155,96,53,0.22)]' 
                              : 'bg-[#faf7f0] border border-[#DDD0B0]'
                          }`}
                        >
                          <span className="text-xs text-[#9B6035] font-medium">{item.day}</span>
                          <span className="flex-1 text-sm text-[#3A2010] truncate">
                            {item.recipe?.name || '—'}
                          </span>
                          {item.done && <span className="text-green-600">✓</span>}
                        </div>
                      ))
                    ) : (
                      // Fallback when no weekly plan
                      DAYS.map((day, index) => (
                        <div 
                          key={day} 
                          className="flex items-center gap-2 py-1.5 px-2 rounded bg-[#faf7f0] border border-[#DDD0B0]"
                        >
                          <span className="text-xs text-[#9B6035] font-medium">{day}</span>
                          <span className="flex-1 text-sm text-[#AA7A50]">未生成</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                {/* 右欄：購物清單 - Simplified placeholder */}
                <div>
                  <div className="text-sm font-bold text-[#3A2010] mb-2">🛒 購物清單</div>
                  <div className="text-xs text-[#AA7A50] italic">
                    選擇食譜後自動生成
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
