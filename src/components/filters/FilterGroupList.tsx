import { useId, useState } from 'react';

interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSectionConfig {
  id: string;
  title: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  variant?: 'default' | 'danger';
  // Presentation-only grouping hint (never business/domain data): sections
  // without a tier - or any caller that doesn't supply one at all - are
  // treated as primary, so existing callers keep their current "everything
  // visible" behavior unchanged.
  tier?: 'primary' | 'secondary';
}

interface FilterGroupListProps {
  sections: FilterSectionConfig[];
}

function FilterSectionBlock({ section }: { section: FilterSectionConfig }) {
  return (
    <div>
      <div className="text-xs font-bold text-[#7A5A38] tracking-wide uppercase mb-2">
        {section.title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {section.options.map(option => {
          const isSelected = section.selected?.includes(option.value);
          return (
            <button
              type="button"
              key={option.value}
              aria-pressed={isSelected}
              onClick={() => section.onToggle(option.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B6035] ${
                isSelected
                  ? 'bg-[#9B6035] text-white border border-[#9B6035]'
                  : 'bg-white text-[#7A5A38] border border-[#E9DFC9] hover:border-[#9B6035]'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Renders filter groups as toggle chips. Shared by FilterShell
 * (/recipes, /favorites, /generate) and the homepage's desktop panel and
 * mobile tray - this is the one place chip markup/behavior is defined.
 *
 * Presentation-only primary/secondary disclosure: sections tagged `tier:
 * 'secondary'` render behind a local "more filters" toggle instead of being
 * hidden by the caller. This component owns that open/closed UI state
 * itself - it is not filter selection state, must never be lifted into a
 * business hook, and never changes `selected`/`onToggle` on its own.
 */
export default function FilterGroupList({ sections }: FilterGroupListProps) {
  const [secondaryExpanded, setSecondaryExpanded] = useState(false);
  const secondaryContentId = `filter-group-list-secondary-${useId()}`;

  const primarySections = sections.filter(section => section.tier !== 'secondary');
  const secondarySections = sections.filter(section => section.tier === 'secondary');

  return (
    <div className="space-y-4">
      {primarySections.map(section => (
        <FilterSectionBlock key={section.id} section={section} />
      ))}

      {secondarySections.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setSecondaryExpanded(v => !v)}
            aria-expanded={secondaryExpanded}
            aria-controls={secondaryContentId}
            className="text-sm text-[#9B6035] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B6035]"
          >
            {secondaryExpanded ? '▲ 收起' : '＋ 更多篩選'}
          </button>

          {/* Always in the DOM so aria-controls always resolves to a real
              element; visibility (not mounting) is what secondaryExpanded
              controls - same pattern FilterShell uses for its own content
              region. */}
          <div
            id={secondaryContentId}
            aria-hidden={!secondaryExpanded}
            className={secondaryExpanded ? 'space-y-4' : 'hidden'}
          >
            {secondarySections.map(section => (
              <FilterSectionBlock key={section.id} section={section} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
