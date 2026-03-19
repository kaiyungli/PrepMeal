import React from 'react';
import FilterSection from './FilterSection';

export interface FilterOption {
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
}

interface SharedFilterPanelProps {
  sections: FilterSectionConfig[];
  primarySectionIds?: string[]; // Sections to show in primary row
  showAdvanced?: boolean;
  setShowAdvanced?: (v: boolean) => void;
  hasAdvanced?: boolean;
  onClear?: () => void;
  advancedLabel?: string;
}

export default function SharedFilterPanel({
  sections,
  primarySectionIds = [],
  showAdvanced = false,
  setShowAdvanced,
  hasAdvanced = false,
  onClear,
  advancedLabel = '更多篩選'
}: SharedFilterPanelProps) {
  // Separate primary and advanced sections
  const primarySections = primarySectionIds.length > 0 
    ? sections.filter(s => primarySectionIds.includes(s.id))
    : sections.slice(0, 4);
  const advancedSections = primarySectionIds.length > 0
    ? sections.filter(s => !primarySectionIds.includes(s.id))
    : sections.slice(4);

  // Collect all selected filters for summary
  const allSelectedFilters = sections
    .flatMap(section => 
      section.selected.map(value => ({
        value,
        label: section.options.find(o => o.value === value)?.label || value,
        sectionId: section.id,
        variant: section.variant
      }))
    );

  return (
    <div className="hidden lg:block mb-5">
      {/* Selected Filters Summary Row */}
      {allSelectedFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: '#E7E0D4' }}>
          <span className="text-xs font-medium" style={{ color: '#7A746B' }}>已選擇：</span>
          {allSelectedFilters.map(filter => (
            <button
              key={`${filter.sectionId}-${filter.value}`}
              onClick={() => {
                const section = sections.find(s => s.id === filter.sectionId);
                if (section) section.onToggle(filter.value);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: filter.variant === 'danger' ? '#FEE2E2' : '#EEF3DF',
                color: filter.variant === 'danger' ? '#DC2626' : '#3A2010',
              }}
            >
              {filter.label}
              <span className="text-xs">×</span>
            </button>
          ))}
        </div>
      )}

      {/* Primary Sections - Grid Layout */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {primarySections.map(section => (
          <FilterSection
            key={section.id}
            title={section.title}
            options={section.options}
            selected={section.selected}
            onToggle={section.onToggle}
            variant={section.variant}
          />
        ))}
        
        {/* Advanced Toggle Button */}
        {hasAdvanced && setShowAdvanced && (
          <div>
            <span className="text-xs font-medium block mb-2" style={{ color: '#7A746B' }}>
              {advancedLabel}
            </span>
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: showAdvanced ? '#9B6035' : 'white',
                color: showAdvanced ? 'white' : '#3A2010',
                border: '1px solid #E7E0D4'
              }}
            >
              {showAdvanced ? '▲ 收起' : '▼ 更多'}
            </button>
          </div>
        )}
      </div>

      {/* Advanced Sections - Collapsible */}
      {showAdvanced && advancedSections.length > 0 && (
        <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: '#F8F3E8' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {advancedSections.map(section => (
              <FilterSection
                key={section.id}
                title={section.title}
                options={section.options}
                selected={section.selected}
                onToggle={section.onToggle}
                variant={section.variant}
              />
            ))}
          </div>
        </div>
      )}

      {/* Clear All Button - Bottom of Filter Card */}
      {onClear && (
        <div className="mt-4 pt-3 border-t flex justify-end">
          <button 
            onClick={onClear} 
            className="text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#E5DCC8] transition-colors"
            style={{ color: '#9B6035' }}
          >
            清除全部
          </button>
        </div>
      )}
    </div>
  );
}
