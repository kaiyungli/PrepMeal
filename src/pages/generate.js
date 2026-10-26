'use client';
import { useAuth } from '@/hooks/useAuth';
import { useGeneratePreferences } from '@/hooks/useGeneratePreferences';
import { useGeneratePageController } from '@/features/generate';
import { getDefaultPlanName } from '@/features/generate/mappers/normalizePlanForSave';

import Head from 'next/head';
import Header from '@/components/layout/Header';
import { useHeaderController } from '@/features/layout/hooks/useHeaderController';
import Footer from '@/components/layout/Footer';

import GenerateSettings from '@/components/generate/GenerateSettings';
import GenerateActions from '@/components/generate/GenerateActions';
import GenerateResults from '@/components/generate/GenerateResults';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import ShoppingListModal from '@/components/ShoppingListModal';
import Toast, { useToast } from '@/components/ui/Toast';

import { UI } from '@/styles/ui';
import { perfLog, createPerfTraceId } from '@/utils/perf';
import { useRef, useEffect, useState } from 'react';

export default function GeneratePage() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status" className="p-6">確認登入狀態…</p>;
  return <GenerateWorkspace key={user?.id || 'guest'} />;
}

function GenerateWorkspace() {
  const headerCtrl = useHeaderController();
  const traceIdRef = useRef(createPerfTraceId('generate_page'));
  const preferences = useGeneratePreferences();
  const { toast, showToast } = useToast();
  const ctrl = useGeneratePageController({ preferences, traceId: traceIdRef.current, showToast });
  const [isSaveDialogOpen, setSaveDialogOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [defaultPlanName, setDefaultPlanName] = useState('');
  const openSaveDialog = () => {
    setDefaultPlanName(getDefaultPlanName(preferences.servings, preferences.daysPerWeek));
    setPlanName('');
    setSaveDialogOpen(true);
  };
  const submitSave = async (event) => {
    event.preventDefault();
    if (planName.trim().length > 100 || ctrl.isSaving) return;
    setSaveDialogOpen(false);
    await ctrl.handleSave(planName);
  };
  
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
  
  const {
    preferences: prefs,
    daysPerWeek,
    effectiveDishesPerDay,
    allRecipes,
    loadingRecipes,
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
    shoppingListError,
    isShoppingListLoading,
    saveNotice,
    isSaving,
    handleGenerate,
    handleOpenShoppingList,
    handleReplaceRecipe,
    handleClearAll,
    handleRecipeClick,
    handleCloseRecipe,
    handleCloseShoppingList,
    handleCopyShoppingList,
    lockSlot,
    unlockSlot,
    removeRecipe,
    
    handleAddRandomRecipe,
  } = ctrl;
  
  const confirmClear = () => {
    if (hasRecipes && !window.confirm('清空目前餐單？已保存到「我的餐單」的餐單不受影響。')) return;
    handleClearAll();
    ctrl.draft.clearNotices();
  };

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
          <div role="status" className="text-sm text-[#3A2010]">
            {ctrl.draft.ready ? ctrl.draft.message : '正在讀取草稿…'}
            {ctrl.draft.notices.map(note => <p key={note}>{note}</p>)}
          </div>
          {ctrl.draft.conflict && <div className="flex gap-3">
            <button type="button" className={UI.buttonGhost} onClick={() => ctrl.draft.resolveConflict(false)}>載入另一分頁草稿</button>
            <button type="button" className={UI.buttonGhost} onClick={() => ctrl.draft.resolveConflict(true)}>保留此頁草稿</button>
          </div>}
          {ctrl.recipesError && <div role="alert" className="rounded-xl bg-white border border-red-300 p-4">
            <p>{ctrl.recipesError}</p>
            <button type="button" className={UI.buttonGhost} onClick={ctrl.retryRecipes} disabled={loadingRecipes}>重新載入食譜</button>
          </div>}
          <fieldset disabled={!ctrl.draft.ready || ctrl.draft.conflict} className="space-y-4 min-w-0">
          <GenerateSettings
            daysPerWeek={prefs.daysPerWeek}
            setDaysPerWeek={prefs.setDaysPerWeek}
            dailyComposition={prefs.dailyComposition}
            setDailyComposition={prefs.setDailyComposition}
            allowCompleteMeal={prefs.allowCompleteMeal}
            setAllowCompleteMeal={prefs.setAllowCompleteMeal}
            servings={prefs.servings}
            setServings={prefs.setServings}
            budget={prefs.budget}
            setBudget={prefs.setBudget}
            filters={prefs.filters}
            setFilters={prefs.setFilters}
            onClearAll={confirmClear}
            isFilterExpanded={isFilterExpanded}
            handleToggleFilterExpanded={handleToggleFilterExpanded}
          />

          <GenerateActions
            recipesError={ctrl.recipesError}
            isSaving={isSaving}
            isLoadingRecipes={loadingRecipes}
            availableRecipeCount={allRecipes.length}
            filteredRecipeCount={filteredRecipes.length}
            availabilityWarnings={ctrl.availabilityWarnings}
            selectedCount={selectedCount}
            hasRecipes={hasRecipes}
            onClear={confirmClear}
            onShoppingList={handleOpenShoppingList}
            onGenerate={handleGenerate}
            onSave={openSaveDialog}
          />

          <GenerateResults
            traceId={traceIdRef.current}
            weeklyPlan={weeklyPlan}
            lockedSlots={lockedSlots}
            daysPerWeek={daysPerWeek}
            dishesPerDay={effectiveDishesPerDay}
            dailyComposition={prefs.dailyComposition}
            filteredRecipes={filteredRecipes}
            onLock={lockSlot}
            onUnlock={unlockSlot}
            onRemove={removeRecipe}
            onReplace={handleReplaceRecipe}
            onAddRandom={handleAddRandomRecipe}
            onRecipeClick={handleRecipeClick}
          />
          </fieldset>
        </div>

        {isSaveDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSaveDialogOpen(false); }}>
            <form role="dialog" aria-modal="true" aria-labelledby="save-plan-title" onSubmit={submitSave} onKeyDown={(event) => { if (event.key === 'Escape') setSaveDialogOpen(false); }} className="w-full max-w-md rounded-xl border border-[#DDD0B0] bg-white p-6 shadow-xl">
              <h2 id="save-plan-title" className="mb-4 text-lg font-bold text-[#3A2010]">保存餐單</h2>
              <label htmlFor="save-plan-name" className="mb-2 block text-sm font-semibold text-[#3A2010]">餐單名稱</label>
              <input id="save-plan-name" autoFocus maxLength={100} placeholder={defaultPlanName} value={planName} onChange={(event) => setPlanName(event.target.value)} className="w-full rounded-lg border border-[#DDD0B0] p-3 text-[#3A2010]" />
              <p className="mt-2 text-xs text-[#66594B]">留空即使用預設名稱；亦可直接輸入新名稱。</p>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" className={UI.buttonGhost} onClick={() => setSaveDialogOpen(false)}>取消</button>
                <button type="submit" className={UI.buttonPrimary} disabled={isSaving}>保存餐單</button>
              </div>
            </form>
          </div>
        )}

        <ShoppingListModal 
          isOpen={showShoppingList} 
          progress={ctrl.draft.shoppingProgress}
          progressStatus={ctrl.draft.message}
          onProgressChange={ctrl.draft.setShoppingProgress}
          progressDisabled={!ctrl.draft.ready || ctrl.draft.conflict}
          onClose={handleCloseShoppingList}
          shoppingListView={shoppingListView}
          loading={isShoppingListLoading}
          error={shoppingListError}
          onCopy={handleCopyShoppingList}
        />

        <RecipeDetailModal 
          isOpen={!!selectedRecipe} 
          onClose={handleCloseRecipe}
          recipe={selectedRecipe}
          loading={modalLoading}
        />

        <Footer />
        
        {toast && <Toast toast={toast} />}
        
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
