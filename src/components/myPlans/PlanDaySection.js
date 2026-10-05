import { UI } from '@/styles/ui';
import PlanRecipeCard from './PlanRecipeCard';

const MEAL_SLOT_ICONS = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍪',
  other: '🍽️',
};

/**
 * PlanDaySection - displays a single day's meals
 * 
 * Props:
 * - dayIndex: number (0-6)
 * - mealSlotGroups: array of { mealSlot, label, items } in display order,
 *   from the plans feature (mealSlotGroupsByDay)
 * - weekStartDate: string (optional) - for calculating actual date
 * - onRecipeClick: function (optional) - called with recipe ID when card clicked
 */
export default function PlanDaySection({ dayIndex, mealSlotGroups, weekStartDate, onRecipeClick }) {
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
  
  const chineseNums = ['一', '二', '三', '四', '五', '六', '七'];
  const dayName = '第' + (chineseNums[dayIndex] || String(dayIndex + 1)) + '天';
  
  const hasItems = mealSlotGroups?.length > 0;

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
          {mealSlotGroups.map(({ mealSlot, label, items }) => (
            <div key={mealSlot}>
              <p className="text-xs font-medium text-[#AA7A50] mb-2">{MEAL_SLOT_ICONS[mealSlot]} {label}</p>
              <div className="space-y-2">
                {items.map((item) => (
                  <PlanRecipeCard 
                    key={item.id} 
                    item={item} 
                    compact
                    onClick={onRecipeClick ? () => onRecipeClick(item.recipe?.id || item.recipe_id) : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)] py-2">無安排</p>
      )}
    </div>
  );
}
