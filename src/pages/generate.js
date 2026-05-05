'use client';
import { useGeneratePreferences } from '@/hooks/useGeneratePreferences';
import { useGeneratePageController } from '@/features/generate';

import Head from 'next/head';
import Header from '@/components/layout/Header';
import { useHeaderController } from '@/features/layout/hooks/useHeaderController';
import Footer from '@/components/layout/Footer';

import GenerateSettings from '@/components/generate/GenerateSettings';
import GenerateActions from '@/components/generate/GenerateActions';
import GenerateResults from '@/components/generate/GenerateResults';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import ShoppingListModal from '@/components/ShoppingListModal';

import { UI } from '@/styles/ui';
import { perfLog, createPerfTraceId } from '@/utils/perf';
import { useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';

export default function GeneratePage() {
  const headerCtrl = useHeaderController();
  const traceIdRef = useRef(createPerfTraceId('generate_page'));
  const preferences = useGeneratePreferences();
  const ctrl = useGeneratePageController({ preferences, traceId: traceIdRef.current });
  
  // Log page mount (effect fires, so duration is 0)
  useEffect(() => {
    perfLog({
      traceId: traceIdRef.current,
      event: 'generate_page_mount',
      stage: 'page_mount',
      label: 'generate.page.mount',
      duration: 0,
      meta: { page: '/generate' }
    });
  }, []);
  
  // Hydrate seed plan from homepage
  const router = useRouter();
  useEffect(() => {
    // Wait for router to be ready and check source
    if (!router.isReady) return;
    if (router.query.source !== 'home-plan') return;
    if (typeof window === 'undefined') return;
    
    const raw = sessionStorage.getItem('prepmeal:generateSeedPlan');
    if (!raw) return;
    
    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.weeklyPlan || !Array.isArray(parsed.weeklyPlan)) return;
      
      // Map to generate page format
      const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      const hydratedPlan = {};
      
      parsed.weeklyPlan.forEach((day, idx) => {
        const key = dayKeys[idx] || `day${idx}`;
        hydratedPlan[key] = (day.items || []).map((item) => ({
          id: item.recipeId,
          recipeName: item.recipeName,
          servings: item.servings || 2
        }));
      });
      
      // Apply to generate page state if has items
      if (Object.keys(hydratedPlan).some(k => hydratedPlan[k]?.length > 0)) {
        ctrl.setWeeklyPlan(hydratedPlan);
      }
      
      sessionStorage.removeItem('prepmeal:generateSeedPlan');
    } catch (error) {
      console.error('[generate] Failed to hydrate seed plan', error);
      sessionStorage.removeItem('prepmeal:generateSeedPlan');
    }
  }, [router.query.source]);
  
  const {
    preferences: prefs,
    daysPerWeek,
    effectiveDishesPerDay,
    filteredRecipes,
    weeklyPlan,
    lockedSlots,
    isFilterExpanded,
    handleToggleFilterExpanded,
    hasRecipes,
    preloadShoppingList,
    selectedCount,
    selectedRecipe,
    modalLoading,
    showShoppingList,
    shoppingListView,
    isShoppingListLoading,
    saveNotice,
    isSaving,
    handleGenerate,
    handleOpenShoppingList,
    handleReplaceRecipe,
    handleClearAll,
    handleSave,
    handleRecipeClick,
    handleCloseRecipe,
    handleCloseShoppingList,
    lockSlot,
    unlockSlot,
    removeRecipe,
    
    handleAddRandomRecipe,
  } = ctrl;
  
  return (
    <>
      <Header {...headerCtrl} />
      <Head><title>今晚食乜 - 一週餐單</title></Head>
      <div className="min-h-screen bg-[#F8F3E8]">
        
        <div className="max-w-[1400px] mx-auto px-6 pt-6 pb-10 space-y-4">
          {/* Hero */}
          <div className="bg-[#9B6035] rounded-xl px-6 py-8 text-center">
            <h1 className='text-[clamp(1.5rem,4vw,2.5rem)] font-black text-white mb-2'>
              一週餐單
            </h1>
            <p className='text-white/80 text-base'>
              為你安排每日晚餐，簡單方便
            </p>
          </div>
          <GenerateSettings
            daysPerWeek={prefs.daysPerWeek}
            setDaysPerWeek={prefs.setDaysPerWeek}
            dailyComposition={prefs.dailyComposition}
            setDailyComposition={prefs.setDailyComposition}
            allowCompleteMeal={prefs.allowCompleteMeal}
            setAllowCompleteMeal={prefs.setAllowCompleteMeal}
            servings={prefs.servings}
            setServings={prefs.setServings}
            filters={prefs.filters}
            setFilters={prefs.setFilters}
            onClearAll={handleClearAll}
            isFilterExpanded={isFilterExpanded}
            handleToggleFilterExpanded={handleToggleFilterExpanded}
          />

          <GenerateActions
            isSaving={isSaving}
            selectedCount={selectedCount}
            hasRecipes={hasRecipes}
            onClear={handleClearAll}
            onShoppingList={handleOpenShoppingList}
            onGenerate={handleGenerate}
            onSave={handleSave}
          />

          <GenerateResults
            traceId={traceIdRef.current}
            weeklyPlan={weeklyPlan}
            lockedSlots={lockedSlots}
            daysPerWeek={daysPerWeek}
            dishesPerDay={effectiveDishesPerDay}
            filteredRecipes={filteredRecipes}
            onLock={lockSlot}
            onUnlock={unlockSlot}
            onRemove={removeRecipe}
            onReplace={handleReplaceRecipe}
            onAddRandom={handleAddRandomRecipe}
            onRecipeClick={handleRecipeClick}
          />
        
        </div>

        <ShoppingListModal 
          isOpen={showShoppingList} 
          onClose={handleCloseShoppingList}
          shoppingListView={shoppingListView}
          loading={isShoppingListLoading}
        />

        <RecipeDetailModal 
          isOpen={!!selectedRecipe} 
          onClose={handleCloseRecipe}
          recipe={selectedRecipe}
          loading={modalLoading}
        />

        <Footer />
        
        {saveNotice && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
            <div className={UI.notice}>
              <span className="text-[var(--color-primary)]">✓</span>
              <span className="font-medium text-[var(--color-text-primary)]">{saveNotice}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
