interface PendingChangesNoticeProps {
  show: boolean;
  onApply: () => void;
}

/**
 * Shown only when the filter panel is collapsed AND there are unconfirmed
 * draft changes - so the user doesn't have to reopen the panel just to see
 * (or act on) the fact that their last edit hasn't taken effect yet.
 */
export default function PendingChangesNotice({ show, onApply }: PendingChangesNoticeProps) {
  if (!show) return null;

  return (
    <div
      className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-[#F0A060]/40 bg-[#FDF3E7] px-4 py-2.5"
      role="status"
    >
      <span className="text-xs text-[#7A5A38]">有未確認的更改，尚未影響下方結果</span>
      <button
        type="button"
        onClick={onApply}
        className="text-xs font-medium text-white bg-[#9B6035] px-3 py-1.5 rounded-lg"
      >
        確認篩選
      </button>
    </div>
  );
}
