import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { groupPlanByDay, PlanItem, PlanDay } from '@/services/weeklyPlan';

interface ShoppingItem {
  name: string;
  qty?: string;
}

interface HomeHeroProps {
  onPrimaryAction?: () => void;
  weeklyPlan?: PlanDay[];
  shoppingList?: ShoppingItem[];
  onRefreshPlan?: () => void;
}

const DAYS = ['週一', '週二', '週三', '週四', '週五'];

function HomeHero({ onPrimaryAction, weeklyPlan = [], shoppingList = [], onRefreshPlan }: HomeHeroProps) {
  const router = useRouter();
  
  const groupedDays = groupPlanByDay(weeklyPlan);
  
  return (
    <section className="bg-[#F8F3E8] relative overflow-hidden py-12 md:py-16">
      {/* Top-right green circle decoration */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-[#C8D49A] opacity-40 -top-32 -right-32 hidden md:block"></div>
      
      {/* Bottom-left warm yellow circle decoration */}
      <div className="absolute w-[250px] h-[250px] rounded-full bg-[#E8C87A] opacity-30 -bottom-20 -left-20 hidden md:block"></div>
      
      <div className="relative z-10 mx-auto max-w-[1200px] px-4">
        <div className="grid grid-cols-12 gap-6 items-center">
          {/* Left side - Text */}
          <div className="col-span-12 md:col-span-7 text-center md:text-left">
            <h1 className="text-7xl md:text-[8rem] font-black leading-[0.9] tracking-[-0.03em] text-[#3A2010]">
              今晚<br/>食乜
            </h1>
            
            <div className="mt-8">
              <button
                onClick={onPrimaryAction}
                className="px-12 py-5 rounded-full bg-[#9B6035] text-white font-bold text-lg shadow-md hover:opacity-95 transition-opacity"
              >
                生成食譜
              </button>
            </div>
          </div>
          
          {/* Right side - HeroCard */}
          <div className="col-span-12 md:col-span-5 hidden md:flex justify-center">
            <div className="w-full max-w-[480px] rounded-2xl border border-[#DDD0B0] bg-white p-6 shadow-[0_30px_80px_rgba(155,96,53,0.18)] scale-[1.05]">
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
              
              <div className="grid grid-cols-2 gap-4">
                {/* 左欄：本週餐單 */}
                <div>
                  <div className="text-sm font-bold text-[#3A2010] mb-2">📅 本週餐單</div>
                  <div className="space-y-1">
                    {groupedDays.length > 0 ? (
                      groupedDays.map((day) => (
                        <div key={day.dayIndex} className="space-y-0.5">
                          <div className="text-xs text-[#9B6035] font-medium">{day.dayName}</div>
                          {day.items.map((item: PlanItem, idx: number) => (
                            <div 
                              key={idx}
                              className="flex items-center gap-1 py-0.5 px-2 rounded bg-[#faf7f0] border border-[#DDD0B0]"
                            >
                              <span className="text-xs text-[#AA7A50]">
                                {item.mealSlot === 'lunch' ? '🥗' : '🍽️'}
                              </span>
                              <span className="flex-1 text-sm text-[#3A2010] truncate">
                                {item.recipeName}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      DAYS.map((day) => (
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
                
                {/* 右欄：購物清單 */}
                <div>
                  <div className="text-sm font-bold text-[#3A2010] mb-2">🛒 購物清單</div>
                  <div className="space-y-1">
                    {shoppingList && shoppingList.length > 0 ? (
                      shoppingList.slice(0, 5).map((item, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between py-1.5 px-2 rounded bg-[#faf7f0] border border-[#DDD0B0]"
                        >
                          <span className="flex-1 text-sm text-[#3A2010] truncate">{item.name}</span>
                          <span className="text-xs text-[#AA7A50]">{item.qty}</span>
                        </div>
                      ))
                    ) : (
                      <div className="py-2 px-2 text-sm text-[#AA7A50]">未生成</div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-[#E5DCC8]">
                <button 
                  onClick={() => router.push('/generate')}
                  className="w-full py-2.5 rounded-xl bg-[#C8D49A] text-[#3A2010] font-semibold text-sm hover:bg-[#B8C489] transition-colors"
                >
                  生成新餐單
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HomeHero;
