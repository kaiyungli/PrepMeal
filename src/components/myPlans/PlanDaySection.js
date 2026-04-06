import { UI } from '@/styles/ui';
import PlanRecipeCard from './PlanRecipeCard';

const DAY_NAMES = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];

/**
 * PlanDaySection - displays a single day's meals
 * 
 * Responsive layout:
 * - Mobile: vertical stack (flex-col)
 * - Desktop (md): horizontal row with wrapping (flex-row flex-wrap)
 */
export default function PlanDaySection({ dayIndex, items }) {
  const dayName = DAY_NAMES[dayIndex] || `Day ${dayIndex + 1}`;
  const hasItems = items?.length > 0;
  
  return (
    <div className={UI.card + " p-4 mb-4"}>
      <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-3">
        {dayName}
      </h3>
      
      {hasItems ? (
        <div className="flex flex-col md:flex-row md:flex-wrap md:gap-3">
          {items.map((item) => (
            <div key={item.id} className="w-full md:w-auto md:flex-1 md:min-w-[200px] md:max-w-[300px]">
              <PlanRecipeCard item={item} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">無安排</p>
      )}
    </div>
  );
}
