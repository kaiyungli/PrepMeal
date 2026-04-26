'use client';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { useHeaderController } from '@/features/layout/hooks/useHeaderController';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { UI } from '@/styles/ui';
import PlanDaySection from '@/components/myPlans/PlanDaySection';
import ShoppingListSection from '@/components/myPlans/ShoppingListSection';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import { useRecipeDetailModal } from '@/features/recipes/hooks/useRecipeDetailModal';
import { usePlanDetailController } from '@/features/plans';

export default function PlanDetailPage() {
  const headerCtrl = useHeaderController();
  const router = useRouter();
  const { id } = router.query;

  const { isAuthenticated, loading: authLoading, getAccessToken, user } = useAuthGuard();

  const controller = usePlanDetailController({
    planId: id,
    isAuthenticated,
    userId: user?.id,
    getAccessToken
  });

  const {
    plan,
    items,
    groupedItems,
    recipeIds,
    avgServings,
    loading: dataLoading,
    error,
    selectedRecipeId,
    handleRecipeClick,
    handleCloseModal
  } = controller;

  // Stabilize recipeItem lookup
  const recipeItem = items.find(
    i => i.recipe?.id === selectedRecipeId || i.recipe_id === selectedRecipeId
  ) || null;

  // Stabilize embeddedRecipe
  const embeddedRecipe = recipeItem ? {
    ...(recipeItem.recipe || {}),
    id: recipeItem.recipe?.id || recipeItem.recipe_id || selectedRecipeId,
  } : null;

  // Use shared hook for full detail
  const { recipe: modalRecipe, loading: modalLoading, error: modalError, close: handleModalClose } = useRecipeDetailModal(
    embeddedRecipe,
    { onClose: handleCloseModal }
  );

  // Auth redirect handled by useAuthGuard
  if (authLoading || !isAuthenticated) {
    return (
      <>
        <Header {...headerCtrl} />
        <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center">
          <p className="text-[var(--color-text-muted)]">載入中...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header {...headerCtrl} />
      <Head><title>{plan?.name || '餐單詳情'} - 今晚食乜</title></Head>
      <div className="min-h-screen bg-[#F8F3E8] py-8">
        <div className="max-w-[800px] mx-auto px-4">
          <Link href="/my-plans" className={UI.textSubtleAction}>
            ← 返回我的餐單
          </Link>

          {dataLoading ? (
            <div className="text-center py-20">
              <p className="text-[var(--color-text-muted)]">載入中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-600">{error}</p>
            </div>
          ) : !plan ? (
            <div className="text-center py-20">
              <p className="text-[var(--color-text-muted)]">搵唔到呢個餐單</p>
            </div>
          ) : (
            <>
              <div className={UI.card + " p-6 mb-6"}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{plan.name}</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-2">
                      {plan.days_count}天
                    </p>
                  </div>
                  {items.length > 0 && (
                    <div className="mt-4 lg:mt-0 lg:ml-4">
                      <ShoppingListSection recipeIds={recipeIds} servings={avgServings} />
                    </div>
                  )}
                </div>
              </div>

              {Array.from({ length: plan.days_count || 7 }).map((_, dayIndex) => (
                <PlanDaySection
                  key={dayIndex}
                  dayIndex={dayIndex}
                  items={groupedItems[dayIndex] || []}
                  weekStartDate={plan.week_start_date}
                  onRecipeClick={handleRecipeClick}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {selectedRecipeId && (
        <RecipeDetailModal
          isOpen={!!selectedRecipeId}
          onClose={handleModalClose}
          recipe={modalRecipe}
          loading={modalLoading}
          error={modalError}
        />
      )}
    </>
  );
}