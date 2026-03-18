import React from 'react';

interface FilterSectionProps {
  label: string;
  children: React.ReactNode;
}

// Filter section with label and chips
export default function FilterSection({ label, children }: FilterSectionProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium text-[#7A746B]">{label}</span>
      <div className="flex flex-wrap gap-1">
        {children}
      </div>
    </div>
  );
}
