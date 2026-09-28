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
 * clears the already-applied selection) shown elsewhere (AppliedFiltersSummary).
 *
 * Composes the shared FilterFooter primitive (also used by FilterShell),
 * supplying the draft-clear button through its leadingActions slot rather
 * than duplicating the confirm row markup.
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
          className="text-sm text-[#9B6035] hover:underline"
        >
          清空選擇
        </button>
      ) : null}
    />
  );
}
