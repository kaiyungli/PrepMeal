export interface AppliedFilterChip {
  sectionId: string;
  value: string;
  label: string;
}

interface AppliedFiltersSummaryProps {
  chips: AppliedFilterChip[];
  appliedSearchQuery: string;
  resultCountText: string;
  onRemoveChip: (sectionId: string, value: string) => void;
  onRemoveSearch: () => void;
  onResetAll: () => void;
}

/**
 * Shows what is actually applied right now (not the draft). Removing a chip
 * here only edits the draft - per the "select first, confirm second" rule,
 * the visible results only change once the user confirms again.
 * "重設篩選" is the one-step action that clears both draft and applied state
 * at once - distinct from the filter panel's "清空選擇" (draft only).
 */
export default function AppliedFiltersSummary({
  chips,
  appliedSearchQuery,
  resultCountText,
  onRemoveChip,
  onRemoveSearch,
  onResetAll,
}: AppliedFiltersSummaryProps) {
  const hasAnyApplied = chips.length > 0 || Boolean(appliedSearchQuery);

  return (
    <div className="mb-4" data-testid="home-filter-applied-summary">
      {hasAnyApplied && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs font-medium text-[#7A5A38]">已套用：</span>
          {appliedSearchQuery && (
            <button
              type="button"
              onClick={onRemoveSearch}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#EEF3DF] text-[#3A2010]"
            >
              搜尋：{appliedSearchQuery}
              <span aria-hidden="true">✕</span>
              <span className="sr-only">移除搜尋條件（需重新確認）</span>
            </button>
          )}
          {chips.map(chip => (
            <button
              key={`${chip.sectionId}-${chip.value}`}
              type="button"
              onClick={() => onRemoveChip(chip.sectionId, chip.value)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#EEF3DF] text-[#3A2010]"
            >
              {chip.label}
              <span aria-hidden="true">✕</span>
              <span className="sr-only">移除（需重新確認）</span>
            </button>
          ))}
          <button
            type="button"
            onClick={onResetAll}
            className="text-xs text-[#9B6035] hover:underline ml-1"
          >
            重設篩選
          </button>
        </div>
      )}
      {resultCountText && (
        <div className="text-sm text-[#7A5A38]">{resultCountText}</div>
      )}
    </div>
  );
}
