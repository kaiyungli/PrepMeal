import FilterFooter from '@/components/filters/FilterFooter';

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
 * clears the already-applied selection) shown elsewhere (AppliedFiltersSummary) -
 * kept as a deliberately distinct label here rather than reusing "重設篩選",
 * since the two buttons do genuinely different things (draft-only vs.
 * draft+applied) and sharing one label between them would be its own kind
 * of confusing "competing terminology."
 *
 * Composes the shared FilterFooter primitive (also used by FilterShell),
 * supplying the draft-clear button through its leadingActions slot rather
 * than duplicating the confirm row markup. Styled here (not in the generic
 * FilterFooter) as a real secondary outlined button - clearly clickable,
 * but visually subordinate to FilterFooter's own primary "確認篩選" button -
 * since this affordance upgrade is Home-specific, not something /recipes,
 * /favorites or /generate's instant-apply "清除全部" line needs.
 */
export default function HomeFilterFooter({
  hasDraftSelection,
  hasPendingChanges,
  onClearDraft,
  onApply,
}: HomeFilterFooterProps) {
  return (
    <FilterFooter
      onApply={onApply}
      hasPendingChanges={hasPendingChanges}
      leadingActions={hasDraftSelection ? (
        <button
          type="button"
          onClick={onClearDraft}
          className="h-10 px-4 rounded-xl border border-[#DDD0B0] bg-white text-sm font-medium text-[#7A5A38] hover:bg-[#FAF7F2] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B6035]"
        >
          清空選擇
        </button>
      ) : null}
    />
  );
}
