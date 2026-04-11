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
import ShoppingListModal from '@/components/generate/ShoppingListModal';

import { UI } from '@/styles/ui';

export default function GeneratePage() {
  const headerCtrl = useHeaderController();
  const preferences = useGeneratePreferences();
  const ctrl = useGeneratePageController({ preferences });
  
  const {
    preferences: prefs,
    daysPerWeek,
    servings,
    effectiveDishesPerDay,
    filteredRecipes,
    weeklyPlan,
    lockedSlots,
    hasRecipes,
    selectedCount,
    selectedRecipe,
    modalLoading,
    showShoppingList,
    shoppingList,
    shoppingListLoaded,
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
    handleResetPlan,
  } = ctrl;
  
  return (
    <>
      <Header {...headerCtrl} />
      <Head><title>今晚食乜 - 一週餐單</title></Head>
      <div className="min-h-screen bg-[#F8F3E8]">
        
        <section className='bg-[#9B6035] px-6 py-8 text-center'>
          <h1 className='text-[clamp(1.5rem,4vw,2.5rem)] font-black text-white mb-2'>
            🍽️ 一週餐單
          </h1>
          <p className='text-white/80 text-base'>
            為你安排每日晚餐，簡單方便
          </p>
        </section>

        <div className="max-w-[1200px] mx-auto px-4 space-y-4">
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
        
        <ShoppingListModal 
          isOpen={showShoppingList} 
          onClose={handleCloseShoppingList}
          shoppingList={shoppingList}
          loading={!shoppingListLoaded}
        />

        <RecipeDetailModal 
          isOpen={!!selectedRecipe} 
          onClose={handleCloseRecipe}
          recipe={selectedRecipe}
          loading={modalLoading}
        />

        </div>
        
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
