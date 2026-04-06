import Link from 'next/link';
import { getRecipeUrl } from './planUtils';

const MEAL_TYPES = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };

/**
 * PlanRecipeCard - displays a single meal item in the plan
 * Clickable if recipe has valid route
 */
export default function PlanRecipeCard({ item }) {
  if (!item) return null;
  
  const { recipe, meal_type, servings } = item;
  const mealLabel = MEAL_TYPES[meal_type] || meal_type;
  const recipeUrl = getRecipeUrl(recipe);
  const hasValidRecipe = recipe && recipeUrl;
  
  // Render clickable card
  if (hasValidRecipe) {
    return (
      <Link
        href={recipeUrl}
        className="block group"
      >
        <div className="flex items-center gap-3 p-2 bg-[#F8F3E8] rounded-lg transition-shadow group-hover:shadow-md">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.name}
              className="w-16 h-16 object-cover rounded"
            />
          ) : (
            <div className="w-16 h-16 bg-[#E5DCC8] rounded flex items-center justify-center text-2xl">
              🍽️
            </div>
          )}
          <div className="flex-1">
            <p className="font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">
              {recipe.name || '未知食譜'}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {mealLabel} · {servings}人份
            </p>
            {recipe && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {recipe.total_time_minutes}分鐘 · {recipe.calories_per_serving}卡
              </p>
            )}
          </div>
        </div>
      </Link>
    );
  }
  
  // Render non-clickable fallback (no valid recipe)
  return (
    <div className="flex items-center gap-3 p-2 bg-[#F8F3E8] rounded-lg opacity-75">
      <div className="w-16 h-16 bg-[#E5DCC8] rounded flex items-center justify-center text-2xl">
        🍽️
      </div>
      <div className="flex-1">
        <p className="font-medium text-[var(--color-text-muted)]">
          {recipe?.name || '未知食譜'}
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          {mealLabel} · {servings}人份
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          食譜資料不完整
        </p>
      </div>
    </div>
  );
}
