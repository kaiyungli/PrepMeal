import React from 'react';
import { FilterOption } from './SharedFilterPanel';

interface FilterSectionProps {
  title?: string;
  label?: string;
  options?: FilterOption[];
  selected?: string[];
  onToggle?: (value: string) => void;
  variant?: 'default' | 'danger';
  children?: React.ReactNode;
}

// Filter section - supports both children (legacy) and options-based (new)
export default function FilterSection({ 
  title, 
  label, 
  options, 
  selected = [], 
  onToggle,
  variant = 'default',
  children 
}: FilterSectionProps) {
  const displayTitle = title || label;
  
  const baseStyle = "px-2 py-1 rounded-full text-xs font-medium";
  const selectedStyle = variant === 'danger' 
    ? "bg-red-500 text-white" 
    : "bg-[#9B6035] text-white";
  const unselectedStyle = "bg-white text-[#3A2010] border border-[#E7E0D4]";

  return (
    <div>
      {displayTitle && (
        <span className="text-xs font-medium block mb-2" style={{ color: '#7A746B' }}>
          {displayTitle}
        </span>
      )}
      <div className="flex flex-wrap gap-1">
        {options && options.length > 0 ? (
          options.map(opt => (
            <button
              key={opt.value}
              onClick={() => onToggle?.(opt.value)}
              className={`${baseStyle} ${selected.includes(opt.value) ? selectedStyle : unselectedStyle}`}
            >
              {opt.label}
            </button>
          ))
        ) : children}
      </div>
    </div>
  );
}
