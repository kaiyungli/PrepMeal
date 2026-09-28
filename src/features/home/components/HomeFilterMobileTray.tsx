import { useEffect, useRef } from 'react';
import { FilterSectionConfig } from '@/components/filters';
import HomeFilterGroups from './HomeFilterGroups';
import HomeFilterFooter from './HomeFilterFooter';

interface HomeFilterMobileTrayProps {
  panelId: string;
  show: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  sections: FilterSectionConfig[];
  hasDraftSelection: boolean;
  hasPendingChanges: boolean;
  onClearDraft: () => void;
  onApply: () => void;
}

/**
 * Mobile (<768px): filters open in a full-height tray from the bottom.
 * - Closing without confirming (backdrop click, Esc, close button) keeps the
 *   draft as-is; nothing is applied until "確認篩選".
 * - Locks background scroll while open, restores it on close/unmount.
 * - Moves focus into the tray on open and back to the trigger button on close.
 */
export default function HomeFilterMobileTray({
  panelId,
  show,
  onClose,
  triggerRef,
  sections,
  hasDraftSelection,
  hasPendingChanges,
  onClearDraft,
  onApply,
}: HomeFilterMobileTrayProps) {
  const trayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Lock background scroll only while the tray is actually the visible
  // presentation (i.e. on a <768px viewport) - on desktop `show` is driven by
  // the same state but the tray stays CSS-hidden, so locking scroll there
  // would block the inline desktop panel from being scrolled to.
  useEffect(() => {
    if (!show) return;
    const isMobileViewport = typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 767px)').matches;
    if (!isMobileViewport) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [show, triggerRef]);

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={trayRef}
        id={`${panelId}-mobile`}
        data-testid="home-filter-mobile-tray"
        role="dialog"
        aria-modal="true"
        aria-label="篩選食譜"
        className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-2xl shadow-lg flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F5EDE3]">
          <span className="text-sm font-semibold text-[#3A2010]">篩選</span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="關閉篩選（不套用未確認的更改）"
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#7A5A38] hover:bg-[#FAF7F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B6035]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <HomeFilterGroups sections={sections} />
        </div>

        <div className="px-5 pb-5">
          <HomeFilterFooter
            hasDraftSelection={hasDraftSelection}
            hasPendingChanges={hasPendingChanges}
            onClearDraft={onClearDraft}
            onApply={onApply}
          />
        </div>
      </div>
    </div>
  );
}
