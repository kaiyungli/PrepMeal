import Link from 'next/link';

/**
 * PlanCard - Enhanced card for my-plans list
 * Shows date range, metadata, recipe preview, and actions
 */
export default function PlanCard({ plan, onDelete, isDeleting }) {
  // Format date range
  const formatDateRange = (startDate, daysCount) => {
    if (!startDate) return '未設定日期';
    const start = new Date(startDate);
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

  // Parse metadata from plan config
  const getMetadata = (plan) => {
    const config = plan.config || {};
    return {
      days: plan.days_count || 7,
      servings: config.servings_per_day || 2,
      dailyComposition: config.daily_composition || 'meat_veg',
      compositionLabel: {
        'meat_veg': '一肉一菜',
        'two_meat_one_veg': '兩肉一菜',
        'complete_meal': '完整餐'
      }[config.daily_composition] || '一肉一菜'
    };
  };

  // Get preview recipes from first few days
  const getPreviewItems = (plan) => {
    if (!plan.items || !plan.items.length) return [];
    return plan.items.slice(0, 3); // First 3 items
  };

  const dateRange = formatDateRange(plan.week_start_date, plan.days_count);
  const metadata = getMetadata(plan);
  const previewItems = getPreviewItems(plan);
  const lastUpdated = formatLastUpdated(plan.updated_at || plan.created_at);
  const isMenuOpen = false; // For dropdown menu state (can be added later)

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-sm hover:shadow-md transition-shadow p-5">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-[#3A2010] text-lg leading-tight">
          {plan.name || '未命名餐單'}
        </h3>
        <div className="relative">
          <button className="text-[#AA7A50] hover:text-[#9B6035] p-1">
            ⋮
          </button>
        </div>
      </div>

      {/* Date Range */}
      <p className="text-sm font-medium text-[#9B6035] mb-2">
        📅 {dateRange}
      </p>

      {/* Metadata Row */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs px-2 py-1 bg-[#F8F3E8] text-[#AA7A50] rounded">
          {metadata.days}日
        </span>
        <span className="text-xs px-2 py-1 bg-[#F8F3E8] text-[#AA7A50] rounded">
          {metadata.servings}人份
        </span>
        <span className="text-xs px-2 py-1 bg-[#F8F3E8] text-[#AA7A50] rounded">
          {metadata.compositionLabel}
        </span>
      </div>

      {/* Recipe Preview */}
      {previewItems.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {previewItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <span className="text-[#9B6035]">•</span>
              <span className="text-[#3A2010] truncate">
                {item.recipe?.name || '未知食譜'}
              </span>
              <span className="text-xs text-[#AA7A50]">
                {item.meal_type === 'breakfast' ? '早餐' : 
                 item.meal_type === 'lunch' ? '午餐' : '晚餐'}
              </span>
            </div>
          ))}
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
          className="px-3 py-2 text-red-500 hover:text-red-600 text-sm font-medium disabled:opacity-50"
        >
          {isDeleting ? '...' : '🗑'}
        </button>
      </div>
    </div>
  );
}
