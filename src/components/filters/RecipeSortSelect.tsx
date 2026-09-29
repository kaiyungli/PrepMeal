const SORT_OPTIONS = [
  { value: 'newest', label: '最新' },
  { value: 'oldest', label: '最舊' },
  { value: 'popular', label: '最受歡迎' },
  { value: 'time_short', label: '最快' },
  { value: 'calories_low', label: '卡路里低到高' },
  { value: 'protein_high', label: '蛋白質高到低' },
];

interface RecipeSortSelectProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  label?: string;
  wrapperClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
}

/**
 * Shared sort control - same option list and change behavior everywhere it
 * appears. Visual density differs by call site (the homepage's bar vs.
 * /recipes' shell header), so layout/typography are passed in rather than
 * hard-coded, instead of branching on which page is rendering it.
 */
export default function RecipeSortSelect({
  id,
  value,
  onChange,
  label = '排序',
  wrapperClassName = 'flex items-center gap-2',
  labelClassName = 'text-xs text-[#7A5A38]',
  selectClassName = 'px-2 py-1 rounded border border-[#DDD0B0] text-xs bg-white',
}: RecipeSortSelectProps) {
  return (
    <div className={wrapperClassName}>
      <label htmlFor={id} className={labelClassName}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="排序方式"
        className={selectClassName}
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
