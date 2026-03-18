import React from 'react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

function FilterChip({ label, selected, onClick, variant = 'default' }: FilterChipProps) {
  const baseStyle = "px-2 py-1 rounded-full text-xs font-medium";
  const selectedStyle = variant === 'danger' 
    ? "bg-red-500 text-white" 
    : "bg-[#9B6035] text-white";
  const unselectedStyle = "bg-white text-[#3A2010] border border-[#E7E0D4]";
  
  return (
    <button
      onClick={onClick}
      className={`${baseStyle} ${selected ? selectedStyle : unselectedStyle}`}
    >
      {label}
    </button>
  );
}

interface FilterSectionProps {
  title: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  variant?: 'default' | 'danger';
}

function FilterSection({ title, options, selected, onToggle, variant = 'default' }: FilterSectionProps) {
  return (
    <div>
      <span className="text-xs font-medium block mb-2" style={{ color: '#7A746B' }}>
        {title}
      </span>
      <div className="flex flex-wrap gap-1">
        {options.map(opt => (
          <FilterChip
            key={opt.value}
            label={opt.label}
            selected={selected.includes(opt.value)}
            onClick={() => onToggle(opt.value)}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
}

interface RecipeFilterPanelProps {
  // Primary filters
  cuisineOptions: FilterOption[];
  selectedCuisines: string[];
  onToggleCuisine: (value: string) => void;
  
  timeOptions: FilterOption[];
  selectedTimes: string[];
  onToggleTime: (value: string) => void;
  
  difficultyOptions: FilterOption[];
  selectedDifficulties: string[];
  onToggleDifficulty: (value: string) => void;
  
  // Advanced filters
  methodOptions: FilterOption[];
  selectedMethods: string[];
  onToggleMethod: (value: string) => void;
  
  dietOptions: FilterOption[];
  selectedDiets: string[];
  onToggleDiet: (value: string) => void;
  
  exclusionOptions: FilterOption[];
  selectedExclusions: string[];
  onToggleExclusion: (value: string) => void;
  
  // State
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  hasFilters: boolean;
  onClear: () => void;
}

export default function RecipeFilterPanel({
  cuisineOptions,
  selectedCuisines,
  onToggleCuisine,
  timeOptions,
  selectedTimes,
  onToggleTime,
  difficultyOptions,
  selectedDifficulties,
  onToggleDifficulty,
  methodOptions,
  selectedMethods,
  onToggleMethod,
  dietOptions,
  selectedDiets,
  onToggleDiet,
  exclusionOptions,
  selectedExclusions,
  onToggleExclusion,
  showAdvanced,
  setShowAdvanced,
  hasFilters,
  onClear,
}: RecipeFilterPanelProps) {
  return (
    <div className="hidden lg:block mb-6 pb-4 border-b">
      {/* Primary Filters - Grid Layout */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <FilterSection
          title="菜系"
          options={cuisineOptions.filter(c => c.value !== '')}
          selected={selectedCuisines}
          onToggle={onToggleCuisine}
        />
        
        <FilterSection
          title="烹飪時間"
          options={timeOptions}
          selected={selectedTimes}
          onToggle={onToggleTime}
        />
        
        <FilterSection
          title="難度"
          options={difficultyOptions}
          selected={selectedDifficulties}
          onToggle={onToggleDifficulty}
        />
        
        <div>
          <span className="text-xs font-medium block mb-2" style={{ color: '#7A746B' }}>
            更多篩選
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
      </div>

      {/* Advanced Filters - Collapsible */}
      {showAdvanced && (
        <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: '#F8F3E8' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FilterSection
              title="烹調方式"
              options={methodOptions}
              selected={selectedMethods}
              onToggle={onToggleMethod}
            />
            
            <FilterSection
              title="飲食偏好"
              options={dietOptions}
              selected={selectedDiets}
              onToggle={onToggleDiet}
            />
            
            <FilterSection
              title="排除項目"
              options={exclusionOptions.slice(0, 4)}
              selected={selectedExclusions}
              onToggle={onToggleExclusion}
              variant="danger"
            />
          </div>
        </div>
      )}

      {/* Clear Button */}
      {hasFilters && (
        <button 
          onClick={onClear} 
          className="text-xs font-medium mt-3" 
          style={{ color: '#9B6035' }}
        >
          清除全部
        </button>
      )}
    </div>
  );
}
