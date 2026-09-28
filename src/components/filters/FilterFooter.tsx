import { ReactNode } from 'react';

interface FilterFooterProps {
  // Instant/no-apply configuration: a single "clear all" link line. The
  // caller decides visibility (e.g. only when something is actually active)
  // by passing onClear as undefined when there is nothing to clear.
  onClear?: () => void;
  clearLabel?: string;
  // Confirm configuration: a combined row with an optional leading slot
  // (e.g. the homepage's "清空選擇" draft-only clear action), a status
  // message, and the apply button. Rendered only when onApply is provided.
  onApply?: () => void;
  hasPendingChanges?: boolean;
  leadingActions?: ReactNode;
}

/**
 * Shared clear/apply footer. Both blocks are independent and can render
 * together - onClear drives the standalone "clear all" line (the
 * instant-apply /recipes, /favorites and /generate case), onApply drives the
 * confirm row with its own leading-action slot (the homepage's draft/confirm
 * case). Neither block knows anything about which page it is rendered from.
 */
export default function FilterFooter({
  onClear,
  clearLabel = '清除全部',
  onApply,
  hasPendingChanges = false,
  leadingActions,
}: FilterFooterProps) {
  return (
    <>
      {onClear && (
        <div className="mt-4 pt-4 border-t border-[#F5EDE3]">
          <button
            type="button"
            onClick={onClear}
            className="text-sm text-[#9B6035] hover:underline"
          >
            {clearLabel}
          </button>
        </div>
      )}
      {onApply && (
        <div className="mt-5 pt-4 border-t border-[#F5EDE3] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {leadingActions}
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
      )}
    </>
  );
}
