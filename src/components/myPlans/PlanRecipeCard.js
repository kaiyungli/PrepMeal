import Link from 'next/link';
import { prefetchRecipeDetail } from '@/features/recipes/services/recipeDetailClientCache';
import { getRecipeUrl } from '@/utils/planUtils';
import { PLAN_MEAL_SLOT_LABELS } from '@/features/plans/mappers/mapPlanMealSlots';

/**
 * PlanRecipeCard - displays a single meal item in the plan
 * Supports两种模式:
 * - onClick provided: calls callback instead of navigation
 * - no onClick: uses Link for navigation (existing behavior)
 */
export default function PlanRecipeCard({ item, onClick, compact = false }) {
  if (!item) return null;
  
  const { recipe, servings } = item;
  const mealLabel = PLAN_MEAL_SLOT_LABELS[item.mealSlot] || PLAN_MEAL_SLOT_LABELS.other;
  const recipeUrl = getRecipeUrl(recipe);
  const hasValidRecipe = Boolean(recipe && recipeUrl);

  // Non-clickable fallback. Runs before cardContent is built, because a saved
  // item's recipe can be missing (e.g. no longer public) and cardContent reads
  // recipe fields directly. The client can't tell why, so the copy stays neutral.
  if (!hasValidRecipe) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E5E5E5] opacity-60">
        <div className="flex-shrink-0">
          <div className={(compact ? "w-10 h-10" : "w-14 h-14") + " bg-[#F6F1EB] rounded-lg flex items-center justify-center text-xl"}>
            🍽️
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-[#9A9A9A] truncate">
            {recipe?.name || '此食譜暫時無法查看'}
          </p>
          <p className="text-xs text-[#B0B0B0] mt-0.5">
            {mealLabel} · {servings}人份
          </p>
          {recipe?.name && (
            <p className="text-xs text-[#B0B0B0] mt-1">
              此食譜暫時無法查看
            </p>
          )}
        </div>
      </div>
    );
  }

  const handlePrefetch = (source) => {
    if (!recipe?.id) return;
    console.log('[recipe-card] prefetch_triggered', { recipeId: recipe.id, source, entry: 'my-plans' });
    prefetchRecipeDetail(recipe.id);
  };
  
  // Only label values that exist, so a missing time or calorie value never
  // leaves a bare "分鐘"/"卡" or a dangling separator.
  const hasValue = (value) => value !== null && value !== undefined && value !== '';
  const recipeMeta = [
    hasValue(recipe.total_time_minutes) && `${recipe.total_time_minutes}分鐘`,
    hasValue(recipe.calories_per_serving) && `${recipe.calories_per_serving}卡`,
  ].filter(Boolean).join(' · ');

  const cardContent = (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E5E5E5] shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-[1px] active:scale-[0.99]">
      {/* Image */}
      <div className="flex-shrink-0">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className={(compact ? "w-10 h-10" : "w-14 h-14") + " object-cover rounded-lg"}
          />
        ) : (
          <div className={(compact ? "w-10 h-10" : "w-14 h-14") + " bg-[#F6F1EB] rounded-lg flex items-center justify-center text-xl"}>
            🍽️
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={(compact ? "text-sm" : "text-[15px]") + " font-semibold text-[#3D3D3D] group-hover:text-[var(--color-primary)] truncate"}>
          {recipe.name || '未知食譜'}
        </p>
        <p className="text-xs text-[#9A9A9A] mt-0.5">
          {mealLabel} · {servings}人份
        </p>
        {recipeMeta && (
          <p className="text-xs text-[#B0B0B0] mt-1">
            {recipeMeta}
          </p>
        )}
      </div>
      
      {/* Chevron */}
      <div className="flex-shrink-0 text-[#B0B0B0] text-lg">
        →
      </div>
    </div>
  );

  // If onClick provided, use button behavior
  if (onClick) {
    return (
      <button 
        onClick={onClick}
          onMouseEnter={() => handlePrefetch('hover')}
                      onFocus={() => handlePrefetch('focus')}
                      onTouchStart={() => {
                        handlePrefetch('touch');
                      }}
        className="w-full text-left cursor-pointer"
      >
        {cardContent}
      </button>
    );
  }
  
  // Default: use Link navigation
  return (
    <Link href={recipeUrl} className="block group">
      {cardContent}
    </Link>
  );
}
