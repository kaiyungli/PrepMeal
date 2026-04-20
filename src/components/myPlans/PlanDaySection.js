import { UI } from '@/styles/ui';
import PlanRecipeCard from './PlanRecipeCard';

/**
 * PlanDaySection - displays a single day's meals
 * 
 * Props:
 * - dayIndex: number (0-6)
 * - items: array of meal items
 * - weekStartDate: string (optional) - for calculating actual date
 * - onRecipeClick: function (optional) - called with recipe ID when card clicked
 */
export default function PlanDaySection({ dayIndex, items, weekStartDate, onRecipeClick }) {
  // Calculate actual date
  const getActualDate = (dayIndex, weekStartDate) => {
    if (!weekStartDate) return null;
    const [y, m, d] = weekStartDate.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    const date = new Date(start);
    date.setDate(date.getDate() + dayIndex);
    return date;
  };

  const date = getActualDate(dayIndex, weekStartDate);
  const dateStr = date 
    ? `${date.getMonth() + 1}/${date.getDate()}`
    : '';
  
  const dayNames = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
  const dayName = dayNames[dayIndex] || `Day ${dayIndex + 1}`;
  
  // Group items by meal slot
  const mealsBySlot = { breakfast: [], lunch: [], dinner: [] };
  if (items?.length) {
    items.forEach(item => {
      const slot = item.meal_slot || 'dinner';
      if (mealsBySlot[slot]) {
        mealsBySlot[slot].push(item);
      }
    });
  }

  const hasItems = items?.length > 0;
  
  // Meal type labels
  const mealLabels = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐'
  };

  return (
    <div className={UI.card + " p-4 mb-4"}>
      {/* Day Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#E5DCC8]">
        <span className="text-lg font-bold text-[#9B6035]">
          {dayName}
        </span>
      </div>
      
      {hasItems ? (
        <div className="space-y-3">
          {/* Breakfast */}
          {mealsBySlot.breakfast.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#AA7A50] mb-2">🌅 早餐</p>
              <div className="space-y-2">
                {mealsBySlot.breakfast.map((item) => (
                  <PlanRecipeCard 
                    key={item.id} 
                    item={item} 
                    compact
                    onClick={onRecipeClick ? () => onRecipeClick(item.recipe?.id) : undefined}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Lunch */}
          {mealsBySlot.lunch.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#AA7A50] mb-2">☀️ 午餐</p>
              <div className="space-y-2">
                {mealsBySlot.lunch.map((item) => (
                  <PlanRecipeCard 
                    key={item.id} 
                    item={item} 
                    compact
                    onClick={onRecipeClick ? () => onRecipeClick(item.recipe?.id) : undefined}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Dinner */}
          {mealsBySlot.dinner.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#AA7A50] mb-2">🌙 晚餐</p>
              <div className="space-y-2">
                {mealsBySlot.dinner.map((item) => (
                  <PlanRecipeCard 
                    key={item.id} 
                    item={item} 
                    compact
                    onClick={onRecipeClick ? () => onRecipeClick(item.recipe?.id) : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)] py-2">無安排</p>
      )}
    </div>
  );
}
