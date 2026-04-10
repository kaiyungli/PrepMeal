export function mapPlanItemsByDay(plan: any, items: any[]) {
  if (!plan || !Array.isArray(items)) return {};

  const startDate = plan.week_start_date
    ? new Date(plan.week_start_date)
    : null;

  const grouped: Record<number, any[]> = {};

  items.forEach((item) => {
    const itemDate = new Date(item.date);

    const diffDays = startDate
      ? Math.floor((itemDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const dayIndex = Math.min(
      Math.max(diffDays >= 0 ? diffDays : 0, 0),
      (plan.days_count || 7) - 1
    );

    if (!grouped[dayIndex]) grouped[dayIndex] = [];
    grouped[dayIndex].push(item);
  });

  return grouped;
}