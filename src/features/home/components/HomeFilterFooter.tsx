interface HomeFilterFooterProps {
  hasDraftSelection: boolean;
  hasPendingChanges: boolean;
  onClearDraft: () => void;
  onApply: () => void;
}

/**
 * "清空選擇" only resets the draft (nothing is applied until confirmed).
 * "確認篩選" commits the draft as the applied selection.
 * These are intentionally two different actions from "重設篩選" (which also
 * clears the already-applied selection) shown elsewhere (AppliedFiltersSummary).
 */
export default function HomeFilterFooter({
  hasDraftSelection,
  hasPendingChanges,
  onClearDraft,
  onApply,
}: HomeFilterFooterProps) {
  return (
    <div className="mt-5 pt-4 border-t border-[#F5EDE3] flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {hasDraftSelection && (
          <button
            type="button"
            onClick={onClearDraft}
            className="text-sm text-[#9B6035] hover:underline"
          >
            清空選擇
          </button>
        )}
        <span className="text-xs text-[#7A5A38]" aria-live="polite">
          {hasPendingChanges ? '有未套用的選項' : '目前顯示已確認的結果'}
        </span>
      </div>
      <button
        type="button"
        onClick={onApply}
        disabled={!hasPendingChanges}
        className="rounded-lg bg-[#9B6035] px-5 py-2.5 text-sm font-medium text-white disabled:cursor-default disabled:opacity-50"
      >
        確認篩選
      </button>
    </div>
  );
}
