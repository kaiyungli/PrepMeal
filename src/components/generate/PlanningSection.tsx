// Planning section - days, servings
interface PlanningSectionProps {
  daysPerWeek: number;
  setDaysPerWeek: (v: number) => void;
  dishesPerDay: number;
  setDishesPerDay: (v: number) => void;
  servings: number;
  setServings: (v: number) => void;
}

export default function PlanningSection({
  daysPerWeek,
  setDaysPerWeek,
  dishesPerDay,
  setDishesPerDay,
  servings,
  setServings,
}: PlanningSectionProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div>
        <label className="block text-xs font-semibold text-[#AA7A50] mb-2">每週日數</label>
        <select
          value={daysPerWeek}
          onChange={(e) => setDaysPerWeek(Number(e.target.value))}
          className="w-full px-3 py-2 rounded-lg bg-[#F8F3E8] text-[#3A2010] text-sm"
        >
          {[3, 4, 5, 6, 7].map(d => (
            <option key={d} value={d}>{d} 天</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#AA7A50] mb-2">每日碟數</label>
        <select
          value={dishesPerDay}
          onChange={(e) => setDishesPerDay(Number(e.target.value))}
          className="w-full px-3 py-2 rounded-lg bg-[#F8F3E8] text-[#3A2010] text-sm"
        >
          {[1, 2, 3, 4].map(d => (
            <option key={d} value={d}>{d} 碟</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#AA7A50] mb-2">人數</label>
        <select
          value={servings}
          onChange={(e) => setServings(Number(e.target.value))}
          className="w-full px-3 py-2 rounded-lg bg-[#F8F3E8] text-[#3A2010] text-sm"
        >
          {[1, 2, 3, 4, 5, 6].map(s => (
            <option key={s} value={s}>{s} 人</option>
          ))}
        </select>
      </div>
    </div>
  );
}
