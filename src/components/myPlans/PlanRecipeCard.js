import Link from 'next/link';
import { getRecipeUrl } from '@/utils/planUtils';

const MEAL_TYPES = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };

/**
 * PlanRecipeCard - displays a single meal item in the plan
 * Supports两种模式:
 * - onClick provided: calls callback instead of navigation
 * - no onClick: uses Link for navigation (existing behavior)
 */
export default function PlanRecipeCard({ item, onClick, compact = false }) {
  if (!item) return null;
  
  const { recipe, meal_type, servings } = item;
  const mealLabel = MEAL_TYPES[meal_type] || meal_type;
  const recipeUrl = getRecipeUrl(recipe);
  const hasValidRecipe = recipe && recipeUrl;
  
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
        {recipe && (
          <p className="text-xs text-[#B0B0B0] mt-1">
            {recipe.total_time_minutes}分鐘 · {recipe.calories_per_serving}卡
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
  if (onClick && hasValidRecipe) {
    return (
      <button 
        onClick={onClick}
          onTouchStart={() => {}}
        className="w-full text-left cursor-pointer"
      >
        {cardContent}
      </button>
    );
  }
  
  // Default: use Link navigation
  if (hasValidRecipe) {
    return (
      <Link href={recipeUrl} className="block group">
        {cardContent}
      </Link>
    );
  }
  
  // Non-clickable fallback
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E5E5E5] opacity-60">
      <div className="flex-shrink-0">
        <div className={(compact ? "w-10 h-10" : "w-14 h-14") + " bg-[#F6F1EB] rounded-lg flex items-center justify-center text-xl"}>
          🍽️
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[#9A9A9A] truncate">
          {recipe?.name || '未知食譜'}
        </p>
        <p className="text-xs text-[#B0B0B0] mt-0.5">
          {mealLabel} · {servings}人份
        </p>
        <p className="text-xs text-[#B0B0B0] mt-1">
          食譜資料不完整
        </p>
      </div>
    </div>
  );
}
