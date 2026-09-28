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

const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

/**
 * Mobile (<768px): filters open in a full-height tray from the bottom.
 * - Closing without confirming (backdrop click, Esc, close button) keeps the
 *   draft as-is; nothing is applied until "確認篩選" - which, inside this
 *   tray, also closes it and restores focus, same as every other close path.
 * - Locks background scroll only while the tray is the actual visible
 *   presentation, and re-evaluates that on every viewport/breakpoint change
 *   while open (not just once at open time) so resizing past 768px while
 *   open can't leave the background permanently unscrollable.
 * - Traps Tab/Shift+Tab within the tray while open, and returns focus to the
 *   trigger button on every close path.
 * - The root element always stays in the DOM (visually + a11y hidden via
 *   `aria-hidden` + Tailwind's `hidden` class when closed, never unmounted)
 *   so the trigger button's `aria-controls` always references a real,
 *   resolvable element regardless of open/closed state.
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
  const previousOverflowRef = useRef('');

  // Scroll lock, kept in sync with the actual breakpoint for as long as the
  // tray is open (not just evaluated once at open time).
  useEffect(() => {
    if (!show) return;
    if (typeof window.matchMedia !== 'function') return;

    previousOverflowRef.current = document.body.style.overflow;
    const mql = window.matchMedia(MOBILE_MEDIA_QUERY);

    const syncScrollLock = (isMobile: boolean) => {
      document.body.style.overflow = isMobile ? 'hidden' : previousOverflowRef.current;
    };
    syncScrollLock(mql.matches);

    const handleChange = (e: MediaQueryListEvent) => syncScrollLock(e.matches);
    mql.addEventListener('change', handleChange);

    return () => {
      mql.removeEventListener('change', handleChange);
      document.body.style.overflow = previousOverflowRef.current;
    };
  }, [show]);

  // Initial focus on open, and focus restore to the trigger on close.
  useEffect(() => {
    if (!show) return;
    closeButtonRef.current?.focus();
    const trigger = triggerRef.current;
    return () => {
      trigger?.focus();
    };
  }, [show, triggerRef]);

  // Esc to close, and a Tab/Shift+Tab focus trap so keyboard users can't
  // tab out into the (visually hidden but otherwise still-present) page
  // behind the tray.
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const container = trayRef.current;
      if (!container) return;
      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (!container.contains(active)) {
        // Focus somehow landed outside the tray (e.g. a prior state left it
        // there) - pull it back in rather than letting Tab continue outside.
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  // Confirming inside the tray also dismisses it and restores focus, same
  // as Esc / backdrop / the close button - handled by the effects above via
  // the `show` transition this triggers.
  const handleApply = () => {
    onApply();
    onClose();
  };

  return (
    <div
      aria-hidden={!show}
      className={show ? 'md:hidden fixed inset-0 z-50' : 'hidden'}
    >
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
            onApply={handleApply}
          />
        </div>
      </div>
    </div>
  );
}
