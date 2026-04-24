import React, { useCallback } from 'react';
import { formatUnit } from '@/lib/formatters'
import { useRouter } from 'next/router';
import { groupPlanByDay, PlanDay } from '@/services/weeklyPlan';

interface ShoppingItem {
  name: string;
  qty?: string;
  unit?: string;
}

interface HomeHeroProps {
  onPrimaryAction?: () => void;
  weeklyPlan?: PlanDay[];
  shoppingList?: ShoppingItem[];
  shoppingLoading?: boolean;
  shoppingError?: string | null;
  isAuthRequired?: boolean;
  onRefreshPlan?: () => void;
  onRefreshShoppingList?: () => void;
  shoppingListInitialized?: boolean;
}

const DAYS = ['週一', '週二', '週三', '週四', '週五'];

function HomeHero({ 
  onPrimaryAction, 
  weeklyPlan = [], 
  shoppingList = [],
  shoppingLoading = false,
  shoppingError = null,
  isAuthRequired = false,
  onRefreshPlan,
  onRefreshShoppingList,
  shoppingListInitialized = false,
}: HomeHeroProps) {
  const router = useRouter();
  
  // Handler to continue with current plan in Generate page
  const handleContinueInGenerate = useCallback(() => {
    // Filter valid items only
    const validPlan = weeklyPlan
      .filter(day => day.items && day.items.some(item => item.recipeId))
      .map(day => ({
        dayIndex: day.dayIndex,
        dayLabel: day.dayName,
        items: day.items
          .filter(item => item.recipeId)
          .map(item => ({
            recipeId: String(item.recipeId),
            recipeName: item.recipeName || '',
            servings: item.servings || 2
          }))
      }));
    
    if (validPlan.length > 0 && validPlan.some(d => d.items.length > 0)) {
      const payload = {
        source: 'home',
        createdAt: Date.now(),
        weeklyPlan: validPlan
      };
      sessionStorage.setItem('prepmeal:generateSeedPlan', JSON.stringify(payload));
      router.push('/generate?source=home-plan');
    } else {
      router.push('/generate');
    }
  }, [weeklyPlan, router]);

  const groupedDays = groupPlanByDay(weeklyPlan);
  
  // Determine shopping list display state
  const showShoppingFallback = shoppingLoading || shoppingError || isAuthRequired || (!shoppingListInitialized && shoppingList.length === 0);
  
  const handleShoppingSectionClick = useCallback(() => {
    // Fetch shopping list when user clicks the section
    if (!shoppingListInitialized && onRefreshShoppingList) {
      onRefreshShoppingList();
    }
  }, [shoppingListInitialized, onRefreshShoppingList]);
  
  const handleShoppingSectionKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!shoppingListInitialized && onRefreshShoppingList) {
        onRefreshShoppingList();
      }
    }
  }, [shoppingListInitialized, onRefreshShoppingList]);
  
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
                      onClick={handleContinueInGenerate}
                      className="w-10 h-10 rounded-xl bg-[#F8F3E8] flex items-center justify-center text-lg hover:bg-[#F4EDDD] transition-colors"
                      title="用目前餐單去生成頁"
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
                {/* 左欄：本週餐單 - ONE dish per day only */}
                <div>
                  <div className="text-sm font-bold text-[#3A2010] mb-2">📅 本週餐單</div>
                  <div className="space-y-1">
                    {groupedDays.length > 0 ? (
                      groupedDays.map((day) => {
                        // Lightweight preview: only FIRST item
                        const previewItem = day.items?.[0];
                        return (
                          <div 
                            key={day.dayIndex} 
                            className="flex items-center gap-2 py-1.5 px-2 rounded bg-[#faf7f0] border border-[#DDD0B0]"
                          >
                            <span className="text-xs text-[#9B6035] font-medium">{day.dayName}</span>
                            <span className="flex-1 text-sm text-[#3A2010] truncate">
                              {previewItem?.recipeName || '未生成'}
                            </span>
                          </div>
                        );
                      })
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
                
                {/* 右欄：購物清單 - with loading/error states */}
                <div 
                  onClick={handleShoppingSectionClick}
                  onKeyDown={handleShoppingSectionKeyDown}
                  className={!shoppingListInitialized ? 'cursor-pointer select-none' : ''}
                  role={!shoppingListInitialized ? 'button' : undefined}
                  tabIndex={!shoppingListInitialized ? 0 : undefined}
                >
                  <div className="text-sm font-bold text-[#3A2010] mb-2">🛒 購物清單</div>
                  <div className="space-y-1">
                    {shoppingLoading ? (
                      // Loading state
                      <div className="py-2 px-2 text-sm text-[#AA7A50]">載入中...</div>
                    ) : isAuthRequired ? (
                      // Not authenticated
                      <div className="py-2 px-2 text-sm text-[#AA7A50]">登入後可見</div>
                    ) : shoppingError ? (
                      // Error state
                      <div className="py-2 px-2 text-sm text-[#AA7A50]">未生成</div>
                    ) : !shoppingListInitialized ? (
                      // Not yet loaded - prompt user to click
                      <div className="py-2 px-2 text-sm text-[#AA7A50]">點擊載入</div>
                    ) : shoppingList.length === 0 ? (
                      // Empty but authenticated
                      <div className="py-2 px-2 text-sm text-[#AA7A50]">無需購買</div>
                    ) : (
                      // Normal display - first 5 items
                      shoppingList.slice(0, 5).map((item, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between py-1.5 px-2 rounded bg-[#faf7f0] border border-[#DDD0B0]"
                        >
                          <span className="flex-1 text-sm text-[#3A2010] truncate">{item.name}</span>
                          <span className="text-xs text-[#AA7A50]">
                            {item.qty ? `${item.qty}${formatUnit(item.unit)}` : ''}
                          </span>
                        </div>
                      ))
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
