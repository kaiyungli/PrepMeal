import { forwardRef } from 'react';

export interface RecipeSearchBarApplyButton {
  /** Full label, shown at sm breakpoint and up. */
  label: string;
  /** Shorter label for narrow viewports; falls back to `label`. */
  shortLabel?: string;
  /** Disabled until there's something to submit. */
  pending: boolean;
}

export interface RecipeSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired on Enter in the input, and by the apply button (if shown) on click. */
  onSubmit?: () => void;
  placeholder?: string;
  /** Omit to render just the input (e.g. pages where search already applies
   * live as you type) - pass to show a persistent submit entry point next
   * to the input (e.g. a page that only applies on explicit confirmation). */
  applyButton?: RecipeSearchBarApplyButton;
  className?: string;
}

/**
 * The single shared implementation of the recipe search input: icon, sizing,
 * placeholder, focus styles, the Enter-to-submit contract, and basic
 * accessibility (aria-label, optional trailing apply button). Every page
 * that searches recipes (home, /recipes, /favorites) renders this same
 * component - page-specific behavior (whether there's an apply button, what
 * submitting actually does) is passed in as props, not branched on inside
 * this file.
 */
const RecipeSearchBar = forwardRef<HTMLInputElement, RecipeSearchBarProps>(function RecipeSearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = '搜尋...',
  applyButton,
  className = '',
}, ref) {
  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      <div className="relative min-w-0 flex-1">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B79B7A]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0a7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSubmit) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full h-11 pl-11 pr-4 rounded-xl border border-[#E9DFC9] bg-[#FFFDF8] text-[15px] text-[#5C4033] placeholder:text-[#B79B7A] focus:outline-none focus:ring-2 focus:ring-[#D9B98C]/30 focus:border-[#D9B98C]"
        />
      </div>

      {applyButton && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!applyButton.pending}
          aria-label={applyButton.label}
          className="h-11 shrink-0 rounded-xl bg-[#9B6035] px-3 sm:px-5 text-sm font-medium text-white transition-colors hover:bg-[#784A29] disabled:cursor-default disabled:bg-[#F3EBE2] disabled:text-[#876F5A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B6035]"
        >
          <span className="sm:hidden">{applyButton.shortLabel ?? applyButton.label}</span>
          <span className="hidden sm:inline">{applyButton.label}</span>
        </button>
      )}
    </div>
  );
});

export default RecipeSearchBar;
