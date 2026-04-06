import { UI } from '@/styles/ui';
import PlanRecipeCard from './PlanRecipeCard';

const DAY_NAMES = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];

/**
 * PlanDaySection - displays a single day's meals
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
        <div className="space-y-3">
          {items.map((item) => (
            <PlanRecipeCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">無安排</p>
      )}
    </div>
  );
}
