import { FilterSectionConfig } from '@/components/filters';

interface HomeFilterGroupsProps {
  sections: FilterSectionConfig[];
}

/**
 * Renders the 8 filter groups as toggle chips.
 * Shared between the desktop inline panel and the mobile tray.
 */
export default function HomeFilterGroups({ sections }: HomeFilterGroupsProps) {
  return (
    <div className="space-y-4">
      {sections.map(section => (
        <div key={section.id}>
          <div className="text-xs font-bold text-[#7A5A38] tracking-wide uppercase mb-2">
            {section.title}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {section.options.map(option => {
              const isSelected = section.selected?.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
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
      ))}
    </div>
  );
}
