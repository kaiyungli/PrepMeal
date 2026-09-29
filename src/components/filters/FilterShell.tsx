// Canonical shared filter shell - the one search/header/toggle/expanded-
// content markup for every page that presents recipe filters (/recipes,
// /favorites, /generate, and the homepage). Page-specific differences
// (instant-apply vs draft/confirm, a bespoke mobile tray, extra header
// affordances like a pending-change dot) are expressed as explicit
// props/slots here, never as branching on which page is rendering - the
// filter *content* itself (chips, footer) is composed by the caller as
// `children`, not auto-rendered by this shell.
//
// Borderless tool section (Option A): this shell is deliberately NOT a
// bordered/shadowed/rounded card. Search stands on its own (it already has
// its own input border via RecipeSearchBar); the header is a static "篩選
// [count]" heading next to a small, visually subordinate disclosure button
// (not one big all-in-one clickable control); expanded content follows the
// header through spacing, not another framed subsection.
import { ReactNode, forwardRef, useId } from 'react';
import RecipeSearchBar, { type RecipeSearchBarApplyButton } from './RecipeSearchBar';

const DEFAULT_CARD_CLASS = '';
const DEFAULT_SEARCH_WRAPPER_CLASS = 'mb-3';
const DEFAULT_TOGGLE_BUTTON_CLASS = 'inline-flex items-center gap-1 text-sm text-[#9B6035] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B6035]';
const DEFAULT_TITLE_CLASS = 'text-sm font-medium text-[#7A5A38]';
const DEFAULT_BADGE_CLASS = 'text-xs bg-[#9B6035] text-white px-2 py-0.5 rounded-full';
const DEFAULT_EXPAND_LABEL_CLASS = '';
const DEFAULT_CONTENT_EXPANDED_CLASS = 'pt-3 pb-4';
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
  // Active count badge, shown next to the static heading (never inside the
  // disclosure button itself).
  activeFilterCount?: number;
  // Draft/confirm affordance next to the heading (a small dot plus an
  // sr-only announcement, and a standing aria-live status line below the
  // header row) - false/omitted renders neither, which is a no-op for
  // instant-apply pages.
  hasPendingChanges?: boolean;
  // Additional header content (rendered opposite the heading/disclosure
  // cluster, never inside the disclosure button - e.g. a sort <select>)
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
  titleClassName = DEFAULT_TITLE_CLASS,
  badgeClassName = DEFAULT_BADGE_CLASS,
  expandLabelClassName = DEFAULT_EXPAND_LABEL_CLASS,
  expandedLabel = '收起',
  collapsedLabel = '展開',
  contentId: contentIdProp,
  contentTestId,
  ariaControls,
  contentExpandedClassName = DEFAULT_CONTENT_EXPANDED_CLASS,
  contentCollapsedClassName = DEFAULT_CONTENT_COLLAPSED_CLASS,
}, ref) {
  // Stable per-instance ids (React 18+ useId) when the caller doesn't supply
  // its own - module-level constants would collide if more than one
  // FilterShell is ever mounted at once. headingId/disclosureLabelId are
  // internal only (never caller-supplied) - they exist purely so the
  // disclosure button's accessible name can be composed from the static
  // heading text + its own visible label via aria-labelledby, without
  // requiring every caller to invent and pass ids of their own.
  const autoContentId = `filter-shell-content-${useId()}`;
  const contentId = contentIdProp ?? autoContentId;
  const resolvedAriaControls = ariaControls ?? contentId;
  const headingId = `filter-shell-heading-${useId()}`;
  const disclosureLabelId = `filter-shell-disclosure-${useId()}`;
  const hasSearch = Boolean(onSearchChange);
  const resolvedHeaderWrapperClassName = headerWrapperClassName
    ?? `flex w-full items-center justify-between gap-3 ${hasSearch ? 'pt-1 pb-3' : 'py-2'}`;

  return (
    <div className={cardClassName} data-testid={cardTestId} data-filter-shell-root="true">
      {/* Search bar - stands on its own, persistent and independent of the
          collapsible detail panel below: it stays visible whether or not
          the filter chips are expanded. It keeps its own existing
          input border/background/radius (see RecipeSearchBar) - this shell
          adds no card around it. */}
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

      {/* Header row: a static "篩選 [count]" heading (never itself
          clickable) sits next to a small, separate disclosure button - not
          one large all-in-one clickable control. headerContent (e.g. a
          sort <select>) is a sibling of that whole cluster, never nested
          inside the disclosure button: a <button> must not contain
          interactive descendants per the HTML content model
          (https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element). */}
      <div className={resolvedHeaderWrapperClassName}>
        <div className="flex items-center gap-2">
          <span id={headingId} className={titleClassName}>{title}</span>
          {activeFilterCount != null && activeFilterCount > 0 && (
            <span className={badgeClassName}>{activeFilterCount}</span>
          )}
          {hasPendingChanges && <span className="w-2 h-2 rounded-full bg-[#F0A060]" aria-hidden="true" />}
          <button
            ref={ref}
            type="button"
            data-testid={toggleTestId}
            onClick={onToggleExpand}
            aria-expanded={isExpanded}
            aria-controls={resolvedAriaControls}
            // The visible button text alone ("收起"/"展開") lacks context on
            // its own - aria-labelledby composes the accessible name from
            // the static heading span plus this button's own label span
            // (in that order), so assistive tech hears e.g. "篩選 收起"
            // rather than just "收起". The count badge/pending dot above are
            // deliberately NOT part of this reference chain, so they never
            // leak into the disclosure's accessible name.
            aria-labelledby={`${headingId} ${disclosureLabelId}`}
            className={toggleButtonClassName}
          >
            <span id={disclosureLabelId} className={expandLabelClassName}>
              {isExpanded ? expandedLabel : collapsedLabel}
            </span>
            <span aria-hidden="true">{isExpanded ? '↑' : '↓'}</span>
          </button>
        </div>
        {headerContent}
      </div>
      <span className="sr-only" role="status">{hasPendingChanges ? '有未確認的更改，尚未影響下方結果' : ''}</span>

      {/* Content - always in the DOM so `aria-controls` above always
          resolves to a real element; visibility (not mounting) is what
          `isExpanded` controls. Follows the header through spacing only -
          no border/card of its own; FilterGroupList owns its own internal
          divider before "更多篩選". */}
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
