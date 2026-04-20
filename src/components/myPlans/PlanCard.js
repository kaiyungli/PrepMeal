import Link from 'next/link';

/**
 * PlanCard - Enhanced card for my-plans list
 * Shows date range, metadata, recipe preview, and actions
 */
export default function PlanCard({ plan, onDelete, isDeleting }) {
  // Format date range - handle timezone safely
  const formatDateRange = (startDate, daysCount) => {
    if (!startDate) return '未設定日期';
    
    // Parse as local date to avoid timezone shift
    const [year, month, day] = startDate.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    const end = new Date(start);
    end.setDate(end.getDate() + (daysCount || 7) - 1);
    
    const format = (d) => `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    return `${format(start)} - ${format(end)}`;
  };

  // Format last updated
  const formatLastUpdated = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return '剛更新';
    if (diffMins < 60) return `${diffMins}分鐘前`;
    if (diffHours < 24) return `${diffHours}小時前`;
    if (diffDays < 7) return `${diffDays}日前`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  // Get metadata - use actual values from plan
  const getMetadata = (plan) => {
    const days = plan.days_count || 7;
    // Get servings from items or use default
    const servings = plan.items?.length > 0 
      ? Math.round(plan.items.reduce((sum, i) => sum + (i.servings || 0), 0) / Math.max(plan.items.filter(i => i.servings).length, 1))
      : 2;
    
    return { days, servings };
  };

  // Get preview items - group by day and show one meal per day
  const getPreviewItems = (plan) => {
    if (!plan.items || !plan.items.length) return [];
    
    // Group by date
    const byDate = {};
    for (const item of plan.items) {
      const date = item.date;
      if (!byDate[date]) {
        byDate[date] = [];
      }
      byDate[date].push(item);
    }
    
    // Take first date's items (first day of plan)
    const firstDate = Object.keys(byDate).sort()[0];
    const firstDayItems = firstDate ? byDate[firstDate] : [];
    
    // Return up to 2 items from first day
    return firstDayItems.slice(0, 2);
  };

  // Get meal type label
  const getMealLabel = (slot) => {
    return {
      'breakfast': '早餐',
      'lunch': '午餐', 
      'dinner': '晚餐'
    }[slot] || '晚餐';
  };

  const dateRange = formatDateRange(plan.week_start_date, plan.days_count);
  const metadata = getMetadata(plan);
  const previewItems = getPreviewItems(plan);
  const lastUpdated = formatLastUpdated(plan.updated_at || plan.created_at);

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-sm hover:shadow-md transition-shadow p-5">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-[#3A2010] text-lg leading-tight">
          {plan.name || '未命名餐單'}
        </h3>
      </div>

      {/* Metadata Row */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs px-2 py-1 bg-[#F8F3E8] text-[#AA7A50] rounded">
          {metadata.days}日
        </span>
        <span className="text-xs px-2 py-1 bg-[#F8F3E8] text-[#AA7A50] rounded">
          {metadata.servings}人份
        </span>
      </div>

      {/* Recipe Preview - First day */}
      {previewItems.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-[#AA7A50] mb-1">第一日:</p>
          <div className="space-y-1">
            {previewItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="text-[#9B6035]">•</span>
                <span className="text-[#3A2010] truncate flex-1">
                  {item.recipe?.name || '未知食譜'}
                </span>
                <span className="text-xs text-[#AA7A50] whitespace-nowrap">
                  {getMealLabel(item.meal_slot)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <p className="text-xs text-[#B0B0B0] mb-4">
          更新於 {lastUpdated}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <Link 
          href={`/my-plans/${plan.id}`}
          className="flex-1 text-center py-2 bg-[#C8D49A] text-[#3A2010] rounded-lg font-medium text-sm hover:bg-[#B8C489] transition-colors"
        >
          查看詳情
        </Link>
        <button 
          onClick={() => onDelete(plan.id)}
          disabled={isDeleting}
          className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-colors"
          aria-label="刪除餐單"
        >
          {isDeleting ? (
            <span className="text-xs">...</span>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1H6a1 1 0 00-1 1v3M8 7h8m-8 0a1 1 0 001-1V4a1 1 0 00-1-1H6a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
