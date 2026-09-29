// Canonical shared filter shell - the one card/search/header/toggle/
// expanded-content markup for every page that presents recipe filters
// (/recipes, /favorites, /generate, and the homepage). Page-specific
// differences (instant-apply vs draft/confirm, a bespoke mobile tray, extra
// header affordances like a pending-change dot) are expressed as explicit
// props/slots here, never as branching on which page is rendering - the
// filter *content* itself (chips, footer) is composed by the caller as
// `children`, not auto-rendered by this shell.
import { ReactNode, forwardRef, useId } from 'react';
import RecipeSearchBar, { type RecipeSearchBarApplyButton } from './RecipeSearchBar';

const DEFAULT_CARD_CLASS = 'rounded-2xl border border-[#E8D9C9] bg-white shadow-sm overflow-hidden';
const DEFAULT_SEARCH_WRAPPER_CLASS = 'px-6 pt-4';
const DEFAULT_TOGGLE_BUTTON_CLASS = 'flex items-center gap-2 text-left hover:opacity-80 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B6035]';
const DEFAULT_ICON_CLASS = 'w-5 h-5 text-[#9B6035]';
const DEFAULT_TITLE_CLASS = 'text-sm font-medium text-[#7A5A38]';
const DEFAULT_BADGE_CLASS = 'text-xs bg-[#9B6035] text-white px-2 py-0.5 rounded-full';
const DEFAULT_EXPAND_LABEL_CLASS = 'text-[#9B6035] text-sm';
const DEFAULT_CONTENT_EXPANDED_CLASS = 'border-t border-[#F5EDE3] px-6 pb-6 pt-4';
const DEFAULT_CONTENT_COLLAPSED_CLASS = 'hidden';

interface FilterShellProps {
  // Title
  title?: string;
  // Search
  searchQuery?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  onSearchSubmit?: () => void;
  // Omit for pages where search already applies live as you type; pass to
  // show a persistent submit entry point next to the input (the homepage's
  // draft/confirm case).
  searchApplyButton?: RecipeSearchBarApplyButton;
  // Expand/collapse
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  // Active count badge on the toggle button
  activeFilterCount?: number;
  // Draft/confirm affordance on the toggle button itself (a small dot plus
  // an sr-only announcement, and a standing aria-live status line below the
  // header row) - false/omitted renders neither, which is a no-op for
  // instant-apply pages.
  hasPendingChanges?: boolean;
  // Additional header content (rendered next to the toggle button, never
  // inside it - e.g. a sort <select>)
  headerContent?: ReactNode;
  // Filter content (chips, footer) - fully composed by the caller.
  children?: ReactNode;

  // Visual/structural slots. Every default below reproduces /recipes,
  // /favorites and /generate's existing look; the homepage overrides these
  // to reproduce its own existing look (see HomeFiltersSection) - neither
  // set of values is baked into this file as a page-name branch.
  cardClassName?: string;
  cardTestId?: string;
  searchWrapperClassName?: string;
  headerWrapperClassName?: string;
  toggleButtonClassName?: string;
  toggleTestId?: string;
  iconClassName?: string;
  titleClassName?: string;
  badgeClassName?: string;
  expandLabelClassName?: string;
  expandedLabel?: string;
  collapsedLabel?: string;
  contentId?: string;
  contentTestId?: string;
  // Defaults to contentId - override when the toggle button controls more
  // than this shell's own content region (the homepage's toggle also
  // controls its separate mobile tray).
  ariaControls?: string;
  contentExpandedClassName?: string;
  contentCollapsedClassName?: string;
}

const FilterShell = forwardRef<HTMLButtonElement, FilterShellProps>(function FilterShell({
  title = '篩選',
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  onSearchSubmit,
  searchApplyButton,
  isExpanded = false,
  onToggleExpand,
  activeFilterCount,
  hasPendingChanges = false,
  headerContent,
  children,
  cardClassName = DEFAULT_CARD_CLASS,
  cardTestId,
  searchWrapperClassName = DEFAULT_SEARCH_WRAPPER_CLASS,
  headerWrapperClassName,
  toggleButtonClassName = DEFAULT_TOGGLE_BUTTON_CLASS,
  toggleTestId,
  iconClassName = DEFAULT_ICON_CLASS,
  titleClassName = DEFAULT_TITLE_CLASS,
  badgeClassName = DEFAULT_BADGE_CLASS,
  expandLabelClassName = DEFAULT_EXPAND_LABEL_CLASS,
  expandedLabel = '▲ 收起',
  collapsedLabel = '▼ 展開',
  contentId: contentIdProp,
  contentTestId,
  ariaControls,
  contentExpandedClassName = DEFAULT_CONTENT_EXPANDED_CLASS,
  contentCollapsedClassName = DEFAULT_CONTENT_COLLAPSED_CLASS,
}, ref) {
  // Stable per-instance id (React 18+ useId) when the caller doesn't supply
  // its own - a module-level constant would collide if more than one
  // FilterShell is ever mounted at once.
  const autoContentId = `filter-shell-content-${useId()}`;
  const contentId = contentIdProp ?? autoContentId;
  const resolvedAriaControls = ariaControls ?? contentId;
  const hasSearch = Boolean(onSearchChange);
  const resolvedHeaderWrapperClassName = headerWrapperClassName
    ?? `flex w-full items-center justify-between gap-3 px-6 ${hasSearch ? 'pt-3 pb-4' : 'py-4'}`;

  return (
    <div className={cardClassName} data-testid={cardTestId} data-filter-shell-root="true">
      {/* Search bar - persistent and independent of the collapsible detail
          panel below: it stays visible whether or not the filter chips are
          expanded. */}
      {hasSearch && (
        <div className={searchWrapperClassName}>
          <RecipeSearchBar
            value={searchQuery || ''}
            onChange={onSearchChange as (v: string) => void}
            onSubmit={onSearchSubmit}
            placeholder={searchPlaceholder || '搜尋...'}
            applyButton={searchApplyButton}
          />
        </div>
      )}

      {/* Header row - the toggle button and any extra header content (e.g. a
          sort <select>) are siblings, never nested: a <button> must not
          contain interactive descendants per the HTML content model
          (https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element),
          and a nested <select> breaks keyboard/screen-reader interaction. */}
      <div className={resolvedHeaderWrapperClassName}>
        <button
          ref={ref}
          type="button"
          data-testid={toggleTestId}
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          aria-controls={resolvedAriaControls}
          className={toggleButtonClassName}
        >
          <svg className={iconClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className={titleClassName}>{title}</span>
          {activeFilterCount != null && activeFilterCount > 0 && (
            <span className={badgeClassName}>{activeFilterCount}</span>
          )}
          {hasPendingChanges && <span className="w-2 h-2 rounded-full bg-[#F0A060]" aria-hidden="true" />}
          <span className="sr-only">{hasPendingChanges ? '，有未確認的更改' : ''}</span>
          <span className={expandLabelClassName}>{isExpanded ? expandedLabel : collapsedLabel}</span>
        </button>
        {headerContent}
      </div>
      <span className="sr-only" role="status">{hasPendingChanges ? '有未確認的更改，尚未影響下方結果' : ''}</span>

      {/* Content - always in the DOM so `aria-controls` above always
          resolves to a real element; visibility (not mounting) is what
          `isExpanded` controls. */}
      <div
        id={contentId}
        data-testid={contentTestId}
        aria-hidden={!isExpanded}
        className={isExpanded ? contentExpandedClassName : contentCollapsedClassName}
      >
        {children}
      </div>
    </div>
  );
});

export default FilterShell;
