import { FilterSectionConfig } from '@/components/filters';
import HomeFilterGroups from './HomeFilterGroups';
import HomeFilterFooter from './HomeFilterFooter';

interface HomeFilterDesktopPanelProps {
  panelId: string;
  show: boolean;
  sections: FilterSectionConfig[];
  hasDraftSelection: boolean;
  hasPendingChanges: boolean;
  onClearDraft: () => void;
  onApply: () => void;
}

/**
 * Desktop (>=768px): filters expand inline, below the search/sort/filter bar.
 * Hidden entirely on mobile - HomeFilterMobileTray takes over there.
 *
 * The root element always stays in the DOM (visually + a11y hidden via
 * `aria-hidden` + Tailwind's `hidden` class when collapsed, never
 * unmounted) so the trigger button's `aria-controls` always references a
 * real, resolvable element regardless of expanded/collapsed state.
 */
export default function HomeFilterDesktopPanel({
  panelId,
  show,
  sections,
  hasDraftSelection,
  hasPendingChanges,
  onClearDraft,
  onApply,
}: HomeFilterDesktopPanelProps) {
  return (
    <div
      id={`${panelId}-desktop`}
      data-testid="home-filter-desktop-panel"
      aria-hidden={!show}
      className={`mt-3 rounded-2xl border border-[#E8D9C9] bg-white shadow-sm px-6 pb-6 pt-5 ${
        show ? 'hidden md:block' : 'hidden'
      }`}
    >
      <HomeFilterGroups sections={sections} />
      <HomeFilterFooter
        hasDraftSelection={hasDraftSelection}
        hasPendingChanges={hasPendingChanges}
        onClearDraft={onClearDraft}
        onApply={onApply}
      />
    </div>
  );
}
