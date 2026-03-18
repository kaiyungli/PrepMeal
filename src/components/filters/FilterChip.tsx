interface FilterChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

// Reusable filter chip component
export default function FilterChip({ 
  label, 
  selected, 
  onClick, 
  variant = 'default' 
}: FilterChipProps) {
  const baseStyle = "px-3 py-1.5 rounded-full text-xs font-medium transition-all";
  const selectedStyle = variant === 'danger' 
    ? "bg-red-500 text-white" 
    : "bg-[#9B6035] text-white";
  const unselectedStyle = "bg-white text-[#3A2010] border border-[#E7E0D4] hover:bg-gray-100";
  
  return (
    <button
      onClick={onClick}
      className={`${baseStyle} ${selected ? selectedStyle : unselectedStyle}`}
    >
      {label}
    </button>
  );
}
